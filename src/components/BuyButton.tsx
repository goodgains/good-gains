"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TRUST_TEXT = "Secure checkout via PayPal - Pay with card or PayPal";

function TrustBadgeIcons() {
  return (
    <div className="space-y-2 pt-1 text-center">
      <div className="flex items-center justify-center">
        <Image
          src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg"
          alt="PayPal"
          width={72}
          height={20}
          className="h-5 w-auto opacity-80"
          unoptimized
        />
      </div>
      <p className="hidden text-xs font-medium text-zinc-300/80" aria-hidden="true">
        Secure checkout via PayPal • Pay with card or PayPal
      </p>
      <p className="text-xs font-medium text-zinc-300/80">{TRUST_TEXT}</p>
    </div>
  );
}

type BuyButtonProps = {
  productName: string;
  productId: string;
  priceIdEnv: string;
  label?: string;
  helperText?: string;
  className?: string;
  variant?: "primary" | "secondary";
  showMeta?: boolean;
  showCoupon?: boolean;
  showTrustBadges?: boolean;
};

export function BuyButton({
  productName,
  productId,
  priceIdEnv,
  label = "Get Instant Access",
  helperText = "Get instant access now",
  className = "",
  variant = "primary",
  showMeta = true,
  showCoupon = false,
  showTrustBadges = false
}: BuyButtonProps) {
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState<{
    valid: boolean;
    discountType: "percentage" | "fixed" | "free" | null;
    discountValue: number;
    finalPrice: number | null;
    error?: string | null;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(id);
  }, []);

  async function applyCoupon() {
    setCouponLoading(true);
    setError("");

    try {
      const response = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, productId })
      });

      const data = (await response.json()) as {
        valid: boolean;
        discountType: "percentage" | "fixed" | "free" | null;
        discountValue: number;
        finalPrice: number | null;
        error?: string | null;
      };

      setCouponStatus(data);
    } catch {
      setCouponStatus({
        valid: false,
        discountType: null,
        discountValue: 0,
        finalPrice: null,
        error: "Unable to validate coupon right now."
      });
    } finally {
      setCouponLoading(false);
    }
  }

  async function handleCheckout() {
    const isFreeCouponCheckout = couponStatus?.valid && couponStatus.finalPrice === 0;

    if (!EMAIL_PATTERN.test(customerEmail.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const endpoint =
        isFreeCouponCheckout
          ? "/api/checkout/free"
          : "/api/checkout";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          productId,
          priceIdEnv,
          couponCode: couponStatus?.valid ? couponCode : "",
          customerEmail
        })
      });

      const raw = await response.text();
      let data:
        | { url?: string; error?: string; success?: boolean; downloadUrl?: string; message?: string }
        | null = null;

      try {
        data = JSON.parse(raw) as {
          url?: string;
          error?: string;
          success?: boolean;
          downloadUrl?: string;
          message?: string;
        };
      } catch {
        throw new Error("Checkout returned an invalid response. Please try again.");
      }

      if (endpoint === "/api/checkout/free") {
        if (!response.ok || !data?.success || !data.downloadUrl) {
          throw new Error(data?.message || "Unable to complete free coupon checkout.");
        }

        window.location.assign(data.downloadUrl);
        return;
      }

      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "Unable to start checkout.");
      }

      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      window.setTimeout(() => {
        setLoading(false);
      }, 250);
    }
  }

  return (
    <div className="relative z-20 space-y-3 pointer-events-auto">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={!isReady || loading}
        className={`relative z-20 inline-flex pointer-events-auto items-center justify-center rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
          variant === "primary"
            ? `w-full border border-emerald-200/50 bg-emerald-300 px-6 py-4 text-base text-black shadow-[0_0_30px_rgba(74,222,128,0.32)] hover:-translate-y-0.5 hover:bg-emerald-200 hover:shadow-[0_0_40px_rgba(74,222,128,0.42)]`
            : `border border-white/15 bg-transparent px-3 py-1.5 text-xs text-zinc-300 hover:border-white/25 hover:text-white`
        } ${className}`}
      >
        {!isReady ? "Loading..." : loading ? "Starting checkout..." : label}
      </button>
      {showTrustBadges ? <TrustBadgeIcons /> : null}
      {showMeta ? (
        <div className="space-y-1.5 pt-2 text-center">
          <p className="text-xs font-medium text-emerald-200">{helperText}</p>
          <p className="text-[1.05rem] font-medium text-zinc-50">
            <span className="font-semibold text-white">Lifetime updates</span> + ongoing improvements
          </p>
        </div>
      ) : null}
      {showCoupon ? (
        <>
          <div className="mx-auto w-full max-w-sm space-y-2 rounded-[1.25rem] border border-white/6 bg-black/20 px-3 py-3 text-left">
            <label className="text-[11px] font-medium text-zinc-400/85" htmlFor={`${productId}-delivery-email`}>
              Email for delivery
            </label>
            <input
              id={`${productId}-delivery-email`}
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              placeholder="you@example.com"
              className="relative z-20 w-full pointer-events-auto rounded-full border border-white/8 bg-black/30 px-3 py-2 text-xs text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-400/30"
            />
          </div>
          <div className="space-y-2 pt-1 text-center">
            <button
              type="button"
              onClick={() => setCouponOpen((open) => !open)}
              className="text-[11px] font-medium text-zinc-400/85 underline decoration-white/15 underline-offset-4 transition hover:text-zinc-200"
              aria-expanded={couponOpen}
              aria-controls={`${productId}-coupon-panel`}
            >
              Have a coupon? Apply it here
            </button>
          </div>
          {couponOpen ? (
            <div
              id={`${productId}-coupon-panel`}
              className="relative z-20 mx-auto w-full max-w-sm space-y-2 rounded-[1.25rem] border border-white/6 bg-black/20 px-3 py-3 text-left pointer-events-auto"
            >
              <div className="relative z-20 flex gap-2 pointer-events-auto">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                  placeholder="Coupon code"
                  className="relative z-20 min-w-0 flex-1 pointer-events-auto rounded-full border border-white/8 bg-black/30 px-3 py-1.5 text-xs text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-400/30"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={!isReady || couponLoading || !couponCode.trim()}
                  className="relative z-20 pointer-events-auto rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:border-white/18 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {!isReady ? "Loading..." : couponLoading ? "Applying..." : "Apply"}
                </button>
              </div>
              {couponStatus ? (
                <p className={`text-[11px] ${couponStatus.valid ? "text-emerald-200/90" : "text-rose-300/90"}`}>
                  {couponStatus.valid
                    ? couponStatus.finalPrice === 0
                      ? "Coupon applied. This order is now free."
                      : `Coupon applied. New price: $${couponStatus.finalPrice?.toFixed(2)}`
                    : couponStatus.error || "Invalid coupon code."}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
      {error ? <p className="text-sm leading-6 text-rose-300">{error}</p> : null}
    </div>
  );
}

