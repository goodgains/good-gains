import { NextResponse } from "next/server";
import { normalizeCouponCode, validateCouponForProduct } from "@/lib/coupons";
import { bundle, getProductPrice, normalizeDeviceCount, products } from "@/lib/products";
import { createPayPalOrder, encodePayPalCustomId, isPayPalConfigured } from "@/lib/paypal";
import {
  createPaddleTransaction,
  encodePaddleCustomData,
  isPaddleConfigured
} from "@/lib/paddle";
import { getBaseUrl } from "@/lib/base-url";

type CheckoutBody = {
  productName?: string;
  productId?: string;
  priceIdEnv?: string;
  couponCode?: string;
  customerEmail?: string;
  deviceCount?: number;
  paymentMethod?: "paypal" | "paddle";
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = (await request.json()) as CheckoutBody;
  const productName = body.productName?.trim();
  const productId = body.productId?.trim();
  const priceEnvName = body.priceIdEnv?.trim();
  const couponCode = normalizeCouponCode(body.couponCode);
  const customerEmail = body.customerEmail?.trim().toLowerCase();
  const deviceCount = normalizeDeviceCount(body.deviceCount);
  const paymentMethod = body.paymentMethod === "paddle" ? "paddle" : "paypal";

  if (!productName || !priceEnvName || !productId || !customerEmail) {
    return NextResponse.json({ error: "Missing checkout product data." }, { status: 400 });
  }

  if (!EMAIL_PATTERN.test(customerEmail)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    const matchedProduct =
      products.find((product) => product.name === productName && product.slug === productId) ??
      (productName === bundle.name && productId === bundle.id ? bundle : null);

    if (!matchedProduct) {
      return NextResponse.json({ error: "Unknown product selected for checkout." }, { status: 400 });
    }

    const isBundleCheckout = productName === bundle.name && productId === bundle.id;

    if (isBundleCheckout && deviceCount !== 1) {
      return NextResponse.json(
        { error: "The bundle is currently available as a 1-device license. 2-device bundle upgrades are handled later." },
        { status: 400 }
      );
    }

    const basePrice = getProductPrice(matchedProduct, isBundleCheckout ? 1 : deviceCount);
    let finalPrice = basePrice;
    let appliedCouponCode: string | null = null;

    if (couponCode) {
      const validation = await validateCouponForProduct({
        code: couponCode,
        productId,
        price: basePrice
      });

      if (!validation.valid || !validation.coupon || validation.finalPrice === null) {
        return NextResponse.json(
          { error: validation.error || "Invalid coupon code." },
          { status: 400 }
        );
      }

      finalPrice = validation.finalPrice;
      appliedCouponCode = validation.coupon.code;
    }

    if (finalPrice <= 0) {
      return NextResponse.json(
        {
          error:
            "Free coupon orders must be processed through the dedicated free checkout endpoint."
        },
        { status: 400 }
      );
    }

    if (paymentMethod === "paypal") {
      if (!isPayPalConfigured()) {
        return NextResponse.json(
          {
            error:
              "PayPal checkout is not configured yet. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET before using Buy Now."
          },
          { status: 503 }
        );
      }

      const order = await createPayPalOrder({
        customId: encodePayPalCustomId({
          productName,
          couponCode: appliedCouponCode || undefined,
          customerEmail,
          deviceCount: isBundleCheckout ? 1 : deviceCount
        }),
        description: matchedProduct.description,
        amount: finalPrice
      });

      return NextResponse.json({ url: order.approveUrl });
    }

    if (!isPaddleConfigured()) {
      return NextResponse.json(
        {
          error:
            "Paddle checkout is not configured yet. Add PADDLE_API_KEY and PADDLE_CLIENT_TOKEN before using card checkout."
        },
        { status: 503 }
      );
    }

    const transaction = await createPaddleTransaction({
      productName,
      description: matchedProduct.description,
      amount: finalPrice,
      customData: encodePaddleCustomData({
        productName,
        couponCode: appliedCouponCode,
        customerEmail,
        deviceCount: isBundleCheckout ? 1 : deviceCount,
        checkoutType: "standard"
      })
    });

    return NextResponse.json({
      url: `${getBaseUrl()}/checkout/paddle?transaction_id=${encodeURIComponent(transaction.id)}`
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to start checkout." },
      { status: 500 }
    );
  }
}
