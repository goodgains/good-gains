import { NextResponse } from "next/server";
import { bundle, products } from "@/lib/products";
import { validateCouponForProduct } from "@/lib/coupons";

type ValidateCouponBody = {
  code?: string;
  productId?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ValidateCouponBody;
  const productId = body.productId?.trim();

  if (!productId) {
    return NextResponse.json(
      { valid: false, discountType: null, discountValue: 0, error: "Missing product ID." },
      { status: 400 }
    );
  }

  const matchedProduct =
    products.find((product) => product.slug === productId) ??
    (productId === bundle.id
      ? {
          slug: bundle.id,
          price: bundle.price
        }
      : null);

  if (!matchedProduct) {
    return NextResponse.json(
      { valid: false, discountType: null, discountValue: 0, error: "Unknown product." },
      { status: 400 }
    );
  }

  const result = await validateCouponForProduct({
    code: body.code,
    productId,
    price: matchedProduct.price
  });

  return NextResponse.json({
    valid: result.valid,
    discountType: result.discountType,
    discountValue: result.discountValue,
    finalPrice: result.finalPrice,
    error: result.error ?? null
  });
}
