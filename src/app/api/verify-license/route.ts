import { NextResponse } from "next/server";
import { verifyProductLicense } from "@/lib/licenses";

type VerifyLicenseBody = {
  licenseKey?: string;
  product?: string;
  machineId?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as VerifyLicenseBody;
  const match = await verifyProductLicense({
    licenseKey: body.licenseKey,
    product: body.product
  });

  if (match) {
    return NextResponse.json({
      ready: true,
      valid: true,
      message: "License verified successfully.",
      license: {
        status: match.status,
        product: body.product ?? "",
        licenseKey: match.license_key,
        issuedAt: match.created_at
      }
    });
  }

  return NextResponse.json({
    ready: true,
    valid: false,
    message: "Invalid license key",
    received: {
      licenseKey: body.licenseKey ?? "",
      product: body.product ?? "",
      machineId: body.machineId ?? ""
    },
    expectedFields: ["license key", "product"]
  });
}
