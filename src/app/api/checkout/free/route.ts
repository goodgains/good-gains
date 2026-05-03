import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  createDeliveryRecord,
  createDownloadAccessCookieValue,
  DOWNLOAD_ACCESS_COOKIE
} from "@/lib/delivery";
import { incrementCouponUsage, normalizeCouponCode, validateCouponForProduct } from "@/lib/coupons";
import { logSupabaseDeliveryEvent } from "@/lib/customer-db";
import { sendPurchaseEmail } from "@/lib/email";
import { bundle, getProductPrice, normalizeDeviceCount, products } from "@/lib/products";
import { siteConfig } from "@/lib/site";

type FreeCheckoutBody = {
  productName?: string;
  productId?: string;
  couponCode?: string;
  customerEmail?: string;
  deviceCount?: number;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FreeCheckoutBody;
    const productName = body.productName?.trim();
    const productId = body.productId?.trim();
    const couponCode = normalizeCouponCode(body.couponCode);
    const customerEmail = body.customerEmail?.trim().toLowerCase();
    const deviceCount = normalizeDeviceCount(body.deviceCount);

    console.log("Free coupon checkout request received", {
      productName: productName ?? null,
      productId: productId ?? null,
      couponCode: couponCode ?? null,
      receivedEmailFromFrontend: body.customerEmail ?? null,
      customerEmail: customerEmail ?? null
    });

    if (!productName || !productId || !couponCode || !customerEmail) {
      console.warn("Free coupon checkout missing required fields", {
        productName: productName ?? null,
        productId: productId ?? null,
        couponCode: couponCode ?? null,
        receivedEmailFromFrontend: body.customerEmail ?? null,
        customerEmail: customerEmail ?? null
      });
      return NextResponse.json(
        { success: false, message: "Missing product, coupon, or customer email." },
        { status: 400 }
      );
    }

    if (!EMAIL_PATTERN.test(customerEmail)) {
      console.warn("Free coupon checkout received invalid customer email", {
        productName,
        productId,
        couponCode,
        receivedEmailFromFrontend: body.customerEmail ?? null,
        customerEmail
      });
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const matchedProduct =
      products.find((product) => product.name === productName && product.slug === productId) ??
      (productName === bundle.name && productId === bundle.id ? bundle : null);

    if (!matchedProduct) {
      return NextResponse.json(
        { success: false, message: "Unknown product selected for free checkout." },
        { status: 400 }
      );
    }

    const isBundleCheckout = productName === bundle.name && productId === bundle.id;

    if (isBundleCheckout && deviceCount !== 1) {
      return NextResponse.json(
        {
          success: false,
          message: "The bundle is currently available as a 1-device license. 2-device bundle upgrades are handled later."
        },
        { status: 400 }
      );
    }

    const basePrice = getProductPrice(matchedProduct, isBundleCheckout ? 1 : deviceCount);

    const validation = await validateCouponForProduct({
      code: couponCode,
      productId,
      price: basePrice
    });

    if (!validation.valid || !validation.coupon || validation.finalPrice !== 0) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error || "This coupon does not create a free order."
        },
        { status: 400 }
      );
    }

    const record = await createDeliveryRecord({
      stripeSessionId: `coupon_${validation.coupon.code}_${crypto.randomUUID()}`,
      paymentProvider: "coupon",
      paymentStatus: "COMPLETED",
      customerEmail,
      customerName: "Coupon Access",
      productName,
      maxDevices: isBundleCheckout ? 1 : deviceCount,
      couponCode: validation.coupon.code,
      amountUsd: 0
    });

    try {
      await incrementCouponUsage(validation.coupon.code);
    } catch (error) {
      console.error("Free coupon usage increment failed", {
        couponCode: validation.coupon.code,
        productId,
        customerEmail,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    console.log("Free coupon email send attempt", {
      receivedEmailFromFrontend: body.customerEmail ?? null,
      customerEmail: record.customerEmail,
      to: record.customerEmail,
      product: record.purchasedProductName,
      licenseKey: record.licenseKey
    });

    try {
      const emailResult = await sendPurchaseEmail(record);
      console.log("Free coupon email sent successfully", {
        receivedEmailFromFrontend: body.customerEmail ?? null,
        customerEmail: record.customerEmail,
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
        context: "free_checkout",
        to: record.customerEmail,
        from: emailResult.from,
        replyTo: emailResult.replyTo,
        provider: "resend",
        sent: true,
        messageId: emailResult.id ?? null,
        providerResponse: "providerResponse" in emailResult ? emailResult.providerResponse : null
      });

      const response = NextResponse.json({
        success: true,
        downloadUrl: `/downloads/${record.token}`,
        licenseKey: record.licenseKey,
        emailDelivery: {
          sent: true,
          provider: "resend",
          mode: emailResult.mode,
          receivedEmailFromFrontend: body.customerEmail ?? null,
          customerEmail: record.customerEmail,
          to: record.customerEmail,
          from: emailResult.from,
          replyTo: emailResult.replyTo,
          resendMessageId: emailResult.id,
          status: "status" in emailResult ? emailResult.status : null,
          providerResponse: "providerResponse" in emailResult ? emailResult.providerResponse : null
        }
      });

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Free coupon email failed", {
        receivedEmailFromFrontend: body.customerEmail ?? null,
        customerEmail: record.customerEmail,
        to: record.customerEmail,
        product: record.purchasedProductName,
        licenseKey: record.licenseKey,
        resendError: errorMessage
      });
      await logSupabaseDeliveryEvent({
        customerId: record.customerId,
        orderId: record.orderId,
        licenseId: record.licenseId,
        context: "free_checkout",
        to: record.customerEmail,
        from: process.env.RESEND_FROM_EMAIL?.trim() || siteConfig.supportEmail,
        replyTo: siteConfig.supportEmail,
        provider: "resend",
        sent: false,
        error: errorMessage
      });

      const response = NextResponse.json({
        success: true,
        downloadUrl: `/downloads/${record.token}`,
        licenseKey: record.licenseKey,
        emailDelivery: {
          sent: false,
          provider: "resend",
          receivedEmailFromFrontend: body.customerEmail ?? null,
          customerEmail: record.customerEmail,
          to: record.customerEmail,
          from: process.env.RESEND_FROM_EMAIL?.trim() || siteConfig.supportEmail,
          replyTo: siteConfig.supportEmail,
          resendError: errorMessage
        }
      });

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
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unable to process free coupon checkout."
      },
      { status: 500 }
    );
  }
}

