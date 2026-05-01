import { NextResponse } from "next/server";
import {
  createDeliveryRecord,
  createDownloadAccessCookieValue,
  DOWNLOAD_ACCESS_COOKIE
} from "@/lib/delivery";
import { incrementCouponUsage } from "@/lib/coupons";
import { sendPurchaseEmail } from "@/lib/email";
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
    const shouldCountCoupon = Boolean(couponCode) && order.status !== "COMPLETED";
    const customerEmail =
      refreshedOrder.payer?.email_address ??
      order.payer?.email_address ??
      finalOrder.payer?.email_address;
    const customerName = [
      refreshedOrder.payer?.name?.given_name ?? order.payer?.name?.given_name ?? finalOrder.payer?.name?.given_name,
      refreshedOrder.payer?.name?.surname ?? order.payer?.name?.surname ?? finalOrder.payer?.name?.surname
    ]
      .filter(Boolean)
      .join(" ");

    if (!productName || !customerEmail) {
      throw new Error("PayPal capture did not return product or customer email.");
    }

    const record = await createDeliveryRecord({
      stripeSessionId: finalOrder.id,
      paymentProvider: "paypal",
      paymentStatus: "COMPLETED",
      customerEmail,
      customerName,
      productName,
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
      to: record.customerEmail,
      product: record.purchasedProductName,
      licenseKey: record.licenseKey
    });

    try {
      const emailResult = await sendPurchaseEmail(record);
      console.log("Email sent successfully", {
        provider: emailResult.mode,
        messageId: emailResult.id,
        status: "status" in emailResult ? emailResult.status : null,
        from: emailResult.from,
        replyTo: emailResult.replyTo,
        providerResponse: "providerResponse" in emailResult ? emailResult.providerResponse : null,
        to: record.customerEmail,
        product: record.purchasedProductName,
        licenseKey: record.licenseKey
      });
    } catch (error) {
      console.error("Email failed", {
        to: record.customerEmail,
        product: record.purchasedProductName,
        licenseKey: record.licenseKey,
        error: error instanceof Error ? error.message : String(error)
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
