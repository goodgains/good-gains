import { promises as fs } from "node:fs";
import path from "node:path";

export type CouponRecord = {
  code: string;
  type: "percentage" | "fixed" | "free";
  value: number;
  productId: string | null;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
};

export type CouponValidationResult = {
  valid: boolean;
  discountType: CouponRecord["type"] | null;
  discountValue: number;
  finalPrice: number | null;
  error?: string;
  coupon?: CouponRecord;
};

const dataDir = path.join(process.cwd(), "data");
const couponsPath = path.join(dataDir, "coupons.json");

async function ensureCouponsFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(couponsPath);
  } catch {
    await fs.writeFile(couponsPath, "[]", "utf8");
  }
}

async function readCoupons() {
  await ensureCouponsFile();
  const raw = await fs.readFile(couponsPath, "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, "")) as CouponRecord[];
}

async function writeCoupons(coupons: CouponRecord[]) {
  await ensureCouponsFile();
  await fs.writeFile(couponsPath, JSON.stringify(coupons, null, 2), "utf8");
}

export function normalizeCouponCode(code?: string | null) {
  return code?.trim().toUpperCase() || "";
}

function isCouponExpired(coupon: CouponRecord) {
  if (!coupon.expiresAt) {
    return false;
  }

  const expiresAtMs = new Date(coupon.expiresAt).getTime();
  return !Number.isNaN(expiresAtMs) && expiresAtMs <= Date.now();
}

export function calculateDiscountedPrice(price: number, coupon: CouponRecord) {
  if (coupon.type === "free") {
    return 0;
  }

  if (coupon.type === "percentage") {
    const nextPrice = price - price * (coupon.value / 100);
    return Math.max(0, Number(nextPrice.toFixed(2)));
  }

  const nextPrice = price - coupon.value;
  return Math.max(0, Number(nextPrice.toFixed(2)));
}

export async function validateCouponForProduct(input: {
  code?: string | null;
  productId: string;
  price: number;
}): Promise<CouponValidationResult> {
  const normalizedCode = normalizeCouponCode(input.code);

  if (!normalizedCode) {
    return {
      valid: false,
      discountType: null,
      discountValue: 0,
      finalPrice: null,
      error: "Coupon code is required."
    };
  }

  const coupons = await readCoupons();
  const coupon = coupons.find((entry) => entry.code === normalizedCode);

  if (!coupon) {
    return {
      valid: false,
      discountType: null,
      discountValue: 0,
      finalPrice: null,
      error: "Invalid coupon code."
    };
  }

  if (!coupon.active) {
    return {
      valid: false,
      discountType: null,
      discountValue: 0,
      finalPrice: null,
      error: "This coupon is not active."
    };
  }

  if (coupon.usedCount >= coupon.maxUses) {
    return {
      valid: false,
      discountType: null,
      discountValue: 0,
      finalPrice: null,
      error: "This coupon has reached its usage limit."
    };
  }

  if (isCouponExpired(coupon)) {
    return {
      valid: false,
      discountType: null,
      discountValue: 0,
      finalPrice: null,
      error: "This coupon has expired."
    };
  }

  if (coupon.productId && coupon.productId !== input.productId) {
    return {
      valid: false,
      discountType: null,
      discountValue: 0,
      finalPrice: null,
      error: "This coupon does not apply to this product."
    };
  }

  const finalPrice = calculateDiscountedPrice(input.price, coupon);

  return {
    valid: true,
    discountType: coupon.type,
    discountValue: coupon.value,
    finalPrice,
    coupon
  };
}

export async function incrementCouponUsage(code: string) {
  const normalizedCode = normalizeCouponCode(code);

  if (!normalizedCode) {
    return null;
  }

  const coupons = await readCoupons();
  const couponIndex = coupons.findIndex((entry) => entry.code === normalizedCode);

  if (couponIndex === -1) {
    return null;
  }

  const coupon = coupons[couponIndex];
  coupon.usedCount += 1;
  coupons[couponIndex] = coupon;
  await writeCoupons(coupons);
  return coupon;
}
