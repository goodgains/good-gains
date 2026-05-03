import { NextResponse } from "next/server";
import { getManagedLicenseOwnership } from "@/lib/customer-db";
import { bundle, bundleDeviceUpgrade } from "@/lib/products";
import { createPayPalOrder, encodePayPalCustomId, isPayPalConfigured } from "@/lib/paypal";

type BundleUpgradeBody = {
  customerEmail?: string;
  licenseKey?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = (await request.json()) as BundleUpgradeBody;
  const customerEmail = body.customerEmail?.trim().toLowerCase() ?? "";
  const licenseKey = body.licenseKey?.trim().toUpperCase() ?? "";

  if (!EMAIL_PATTERN.test(customerEmail) || !licenseKey) {
    return NextResponse.json(
      { error: "Enter the same purchase email and bundle license key to continue." },
      { status: 400 }
    );
  }

  const ownership = await getManagedLicenseOwnership({
    email: customerEmail,
    licenseKey
  });

  if (!ownership || ownership.status !== "active" || ownership.paymentStatus !== "COMPLETED") {
    return NextResponse.json(
      { error: "We couldn't find an active bundle license for that email and license key." },
      { status: 404 }
    );
  }

  if (!ownership.isBundlePurchase) {
    return NextResponse.json(
      { error: "Only bundle licenses can be upgraded to 2 devices here." },
      { status: 400 }
    );
  }

  if (ownership.maxDevices >= 2) {
    return NextResponse.json({
      alreadyUpgraded: true,
      message: "This bundle license already supports 2 devices."
    });
  }

  if (!isPayPalConfigured()) {
    return NextResponse.json(
      {
        error:
          "PayPal checkout is not configured yet. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET before using bundle upgrades."
      },
      { status: 503 }
    );
  }

  try {
    const order = await createPayPalOrder({
      customId: encodePayPalCustomId({
        productName: bundle.name,
        customerEmail,
        checkoutType: "bundle_device_upgrade",
        licenseKey,
        upgradeToDevices: 2
      }),
      description: `${bundleDeviceUpgrade.name} for ${bundle.name}`,
      amount: bundleDeviceUpgrade.price
    });

    return NextResponse.json({ url: order.approveUrl });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to start the 2-device bundle upgrade."
      },
      { status: 500 }
    );
  }
}
