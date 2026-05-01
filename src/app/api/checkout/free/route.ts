import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  createDeliveryRecord,
  createDownloadAccessCookieValue,
  DOWNLOAD_ACCESS_COOKIE
} from "@/lib/delivery";
import { incrementCouponUsage, normalizeCouponCode, validateCouponForProduct } from "@/lib/coupons";
import { sendPurchaseEmail } from "@/lib/email";
import { bundle, products } from "@/lib/products";

type FreeCheckoutBody = {
  productName?: string;
  productId?: string;
  couponCode?: string;
  customerEmail?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FreeCheckoutBody;
    const productName = body.productName?.trim();
    const productId = body.productId?.trim();
    const couponCode = normalizeCouponCode(body.couponCode);
    const customerEmail = body.customerEmail?.trim().toLowerCase();

    if (!productName || !productId || !couponCode || !customerEmail) {
      return NextResponse.json(
        { success: false, message: "Missing product, coupon, or customer email." },
        { status: 400 }
      );
    }

    if (!EMAIL_PATTERN.test(customerEmail)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const matchedProduct =
      products.find((product) => product.name === productName && product.slug === productId) ??
      (productName === bundle.name && productId === bundle.id
        ? {
            slug: bundle.id,
            name: bundle.name,
            price: bundle.price
          }
        : null);

    if (!matchedProduct) {
      return NextResponse.json(
        { success: false, message: "Unknown product selected for free checkout." },
        { status: 400 }
      );
    }

    const validation = await validateCouponForProduct({
      code: couponCode,
      productId,
      price: matchedProduct.price
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
      productName
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
      to: record.customerEmail,
      product: record.purchasedProductName,
      licenseKey: record.licenseKey
    });

    try {
      const emailResult = await sendPurchaseEmail(record);
      console.log("Free coupon email sent successfully", {
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

      const response = NextResponse.json({
        success: true,
        downloadUrl: `/downloads/${record.token}`,
        licenseKey: record.licenseKey,
        emailDelivery: {
          sent: true,
          provider: emailResult.mode,
          messageId: emailResult.id,
          from: emailResult.from,
          replyTo: emailResult.replyTo
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
        to: record.customerEmail,
        product: record.purchasedProductName,
        licenseKey: record.licenseKey,
        error: errorMessage
      });

      const response = NextResponse.json({
        success: true,
        downloadUrl: `/downloads/${record.token}`,
        licenseKey: record.licenseKey,
        emailDelivery: {
          sent: false,
          error: errorMessage
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

