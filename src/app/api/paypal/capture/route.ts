import { NextResponse } from "next/server";
import {
  createDeliveryRecord,
  createDownloadAccessCookieValue,
  DOWNLOAD_ACCESS_COOKIE
} from "@/lib/delivery";
import { incrementCouponUsage } from "@/lib/coupons";
import { getManagedLicenseOwnership, logSupabaseDeliveryEvent, upgradeLicenseDeviceLimit } from "@/lib/customer-db";
import { sendPurchaseEmail } from "@/lib/email";
import { siteConfig } from "@/lib/site";
import { capturePayPalOrder, getBaseUrl, getPayPalOrder, parsePayPalCustomId } from "@/lib/paypal";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("token");

  if (!orderId) {
    return NextResponse.redirect(new URL("/cancel", getBaseUrl()));
  }

  try {
    const order = await getPayPalOrder(orderId);

    if (order.status !== "APPROVED" && order.status !== "COMPLETED") {
      return NextResponse.redirect(new URL("/cancel", getBaseUrl()));
    }

    const finalOrder =
      order.status === "COMPLETED"
        ? order
        : await capturePayPalOrder(orderId);

    if (finalOrder.status !== "COMPLETED") {
      return NextResponse.redirect(new URL("/cancel", getBaseUrl()));
    }

    const refreshedOrder = await getPayPalOrder(orderId).catch(() => order);
    const customId =
      refreshedOrder.purchase_units?.[0]?.custom_id ??
      order.purchase_units?.[0]?.custom_id ??
      finalOrder.purchase_units?.[0]?.custom_id;
    const customIdPayload = parsePayPalCustomId(customId);
    const productName = customIdPayload?.productName;
    const couponCode = customIdPayload?.couponCode;
    const deliveryEmail = customIdPayload?.customerEmail;
    const deviceCount = customIdPayload?.deviceCount === 2 ? 2 : 1;
    const checkoutType = customIdPayload?.checkoutType ?? "standard";
    const upgradeLicenseKey = customIdPayload?.licenseKey ?? null;
    const upgradeToDevices = customIdPayload?.upgradeToDevices === 2 ? 2 : 1;
    const shouldCountCoupon = Boolean(couponCode) && order.status !== "COMPLETED";
    const customerEmail =
      deliveryEmail ??
      refreshedOrder.payer?.email_address ??
      order.payer?.email_address ??
      finalOrder.payer?.email_address;
    const amountUsd = Number.parseFloat(
      refreshedOrder.purchase_units?.[0]?.amount?.value ??
        order.purchase_units?.[0]?.amount?.value ??
        finalOrder.purchase_units?.[0]?.amount?.value ??
        "0"
    );
    const customerName = [
      refreshedOrder.payer?.name?.given_name ?? order.payer?.name?.given_name ?? finalOrder.payer?.name?.given_name,
      refreshedOrder.payer?.name?.surname ?? order.payer?.name?.surname ?? finalOrder.payer?.name?.surname
    ]
      .filter(Boolean)
      .join(" ");

    if (!productName || !customerEmail) {
      throw new Error("PayPal capture did not return product or customer email.");
    }

    if (checkoutType === "bundle_device_upgrade") {
      if (!upgradeLicenseKey) {
        throw new Error("Bundle upgrade checkout did not include a license key.");
      }

      const upgradedLicense = await upgradeLicenseDeviceLimit({
        customerEmail,
        licenseKey: upgradeLicenseKey,
        maxDevices: upgradeToDevices
      });

      if (!upgradedLicense) {
        throw new Error("Unable to upgrade the bundle license to 2 devices.");
      }

      const ownership = await getManagedLicenseOwnership({
        email: customerEmail,
        licenseKey: upgradeLicenseKey
      });

      await logSupabaseDeliveryEvent({
        customerId: ownership?.customerId ?? null,
        orderId: ownership?.orderId ?? null,
        licenseId: ownership?.licenseId ?? null,
        context: "bundle_device_upgrade",
        to: customerEmail,
        from: siteConfig.supportEmail,
        replyTo: siteConfig.supportEmail,
        provider: "paypal",
        sent: true,
        providerResponse: {
          orderId: finalOrder.id,
          upgradedToDevices: upgradeToDevices
        }
      });

      return NextResponse.redirect(new URL("/license-activation?upgrade=success", getBaseUrl()));
    }

    const record = await createDeliveryRecord({
      stripeSessionId: finalOrder.id,
      paymentProvider: "paypal",
      paymentStatus: "COMPLETED",
      customerEmail,
      customerName,
      productName,
      maxDevices: deviceCount,
      couponCode: couponCode ?? null,
      amountUsd: Number.isFinite(amountUsd) ? amountUsd : null,
      createdAt:
        refreshedOrder.create_time ??
        order.create_time ??
        finalOrder.create_time ??
        finalOrder.update_time ??
        new Date().toISOString()
    });

    if (couponCode && shouldCountCoupon) {
      try {
        await incrementCouponUsage(couponCode);
      } catch (error) {
        console.error("Coupon usage increment failed", {
          couponCode,
          orderId: finalOrder.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    console.log("PayPal email send attempt", {
      customerEmail: record.customerEmail,
      to: record.customerEmail,
      product: record.purchasedProductName,
      licenseKey: record.licenseKey
    });

    try {
      const emailResult = await sendPurchaseEmail(record);
      console.log("Email sent successfully", {
        provider: emailResult.mode,
        resendMessageId: emailResult.id,
        status: "status" in emailResult ? emailResult.status : null,
        from: emailResult.from,
        replyTo: emailResult.replyTo,
        providerResponse: "providerResponse" in emailResult ? emailResult.providerResponse : null,
        to: record.customerEmail,
        product: record.purchasedProductName,
        licenseKey: record.licenseKey
      });
      await logSupabaseDeliveryEvent({
        customerId: record.customerId,
        orderId: record.orderId,
        licenseId: record.licenseId,
        context: "paypal_capture",
        to: record.customerEmail,
        from: emailResult.from,
        replyTo: emailResult.replyTo,
        provider: "resend",
        sent: true,
        messageId: emailResult.id ?? null,
        providerResponse: "providerResponse" in emailResult ? emailResult.providerResponse : null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Email failed", {
        to: record.customerEmail,
        product: record.purchasedProductName,
        licenseKey: record.licenseKey,
        resendError: errorMessage
      });
      await logSupabaseDeliveryEvent({
        customerId: record.customerId,
        orderId: record.orderId,
        licenseId: record.licenseId,
        context: "paypal_capture",
        to: record.customerEmail,
        from: process.env.RESEND_FROM_EMAIL?.trim() || siteConfig.supportEmail,
        replyTo: siteConfig.supportEmail,
        provider: "resend",
        sent: false,
        error: errorMessage
      });
    }

    const response = NextResponse.redirect(new URL(`/downloads/${record.token}`, getBaseUrl()));
    response.cookies.set({
      name: DOWNLOAD_ACCESS_COOKIE,
      value: createDownloadAccessCookieValue(record.token, record.customerEmail),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: record.expiresAt ? new Date(record.expiresAt) : undefined
    });

    return response;
  } catch {
    return NextResponse.redirect(new URL("/cancel", getBaseUrl()));
  }
}
