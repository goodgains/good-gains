import { NextResponse } from "next/server";
import { normalizeCouponCode, validateCouponForProduct } from "@/lib/coupons";
import { bundle, products } from "@/lib/products";
import { createPayPalOrder, encodePayPalCustomId, isPayPalConfigured } from "@/lib/paypal";

type CheckoutBody = {
  productName?: string;
  productId?: string;
  priceIdEnv?: string;
  couponCode?: string;
  customerEmail?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = (await request.json()) as CheckoutBody;
  const productName = body.productName?.trim();
  const productId = body.productId?.trim();
  const priceEnvName = body.priceIdEnv?.trim();
  const couponCode = normalizeCouponCode(body.couponCode);
  const customerEmail = body.customerEmail?.trim().toLowerCase();

  if (!productName || !priceEnvName || !productId || !customerEmail) {
    return NextResponse.json({ error: "Missing checkout product data." }, { status: 400 });
  }

  if (!EMAIL_PATTERN.test(customerEmail)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    const matchedProduct =
      products.find((product) => product.name === productName && product.slug === productId) ??
      (productName === bundle.name && productId === bundle.id
        ? {
            slug: bundle.id,
            name: bundle.name,
            description: "Bundle of all four Good Gains tools.",
            price: bundle.price
          }
        : null);

    if (!matchedProduct) {
      return NextResponse.json({ error: "Unknown product selected for checkout." }, { status: 400 });
    }

    let finalPrice = matchedProduct.price;
    let appliedCouponCode: string | null = null;

    if (couponCode) {
      const validation = await validateCouponForProduct({
        code: couponCode,
        productId,
        price: matchedProduct.price
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
        customerEmail
      }),
      description: matchedProduct.description,
      amount: finalPrice
    });

    return NextResponse.json({ url: order.approveUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create PayPal checkout session." },
      { status: 500 }
    );
  }
}
