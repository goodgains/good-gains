import { NextResponse } from "next/server";
import { getRecoveryPurchasesByEmail, logSupabaseDeliveryEvent } from "@/lib/customer-db";
import { sendLicenseRecoveryEmail } from "@/lib/email";
import { siteConfig } from "@/lib/site";

type RecoverLicenseBody = {
  email?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_MESSAGE = "If this email exists, we’ll send your license details.";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as RecoverLicenseBody;
  const email = body.email?.trim().toLowerCase() ?? "";

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      {
        success: false,
        message: "Please enter a valid email address."
      },
      { status: 400 }
    );
  }

  const purchases = await getRecoveryPurchasesByEmail(email);

  if (purchases.length === 0) {
    return NextResponse.json({
      success: true,
      message: SAFE_MESSAGE,
      emailDelivery: {
        sent: false,
        provider: "resend",
        to: email
      }
    });
  }

  try {
    const emailResult = await sendLicenseRecoveryEmail({
      customerEmail: email,
      entries: purchases.map((purchase) => ({
        productName: purchase.productName,
        licenseKey: purchase.licenseKey,
        downloadToken: purchase.downloadToken,
        createdAt: purchase.createdAt,
        purchasedSlugs: purchase.purchasedSlugs
      }))
    });

    await Promise.all(
      purchases.map((purchase) =>
        logSupabaseDeliveryEvent({
          customerId: purchase.customerId,
          orderId: purchase.orderId,
          licenseId: purchase.licenseId,
          context: "recover_license",
          to: email,
          from: emailResult.from,
          replyTo: emailResult.replyTo,
          provider: "resend",
          sent: true,
          messageId: emailResult.id ?? null,
          providerResponse: "providerResponse" in emailResult ? emailResult.providerResponse : null
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: SAFE_MESSAGE,
      emailDelivery: {
        sent: true,
        provider: "resend",
        to: email,
        from: emailResult.from,
        replyTo: emailResult.replyTo,
        resendMessageId: emailResult.id,
        providerResponse: "providerResponse" in emailResult ? emailResult.providerResponse : null
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await Promise.all(
      purchases.map((purchase) =>
        logSupabaseDeliveryEvent({
          customerId: purchase.customerId,
          orderId: purchase.orderId,
          licenseId: purchase.licenseId,
          context: "recover_license",
          to: email,
          from: process.env.RESEND_FROM_EMAIL?.trim() || siteConfig.supportEmail,
          replyTo: siteConfig.supportEmail,
          provider: "resend",
          sent: false,
          error: errorMessage
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: SAFE_MESSAGE,
      emailDelivery: {
        sent: false,
        provider: "resend",
        to: email,
        from: process.env.RESEND_FROM_EMAIL?.trim() || siteConfig.supportEmail,
        replyTo: siteConfig.supportEmail,
        resendError: errorMessage
      }
    });
  }
}
