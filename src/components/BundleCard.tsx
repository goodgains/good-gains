import Link from "next/link";
import { BuyButton } from "@/components/BuyButton";
import { PaymentTrust } from "@/components/PaymentTrust";
import { bundle, products } from "@/lib/products";

export function BundleCard({
  showDetailsLink = true,
  showCoupon = false,
  showTrustBadges = true,
  showPurchase = true,
  showIntegratedBenefits = false
}: {
  showDetailsLink?: boolean;
  showCoupon?: boolean;
  showTrustBadges?: boolean;
  showPurchase?: boolean;
  showIntegratedBenefits?: boolean;
}) {
  const individualTotal = products.reduce((sum, product) => sum + product.price, 0);

  return (
    <section className="overflow-hidden rounded-[2rem] border border-emerald-400/24 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.22),_rgba(0,0,0,0.92)_48%)] p-8 shadow-[0_20px_90px_rgba(0,0,0,0.24),0_0_38px_rgba(74,222,128,0.1)]">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
        <div className="flex h-full flex-col gap-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
              Best Value
            </span>
            <span className="inline-flex rounded-full border border-rose-300/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-rose-200">
              Limited-time offer
            </span>
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl font-semibold text-white md:text-4xl">Complete Trading System for Precision, Execution & Protection</h3>
              <p className="max-w-2xl text-base leading-7 text-zinc-300">
                Everything you need to trade with structure — enter better, execute faster, protect your profits, and understand the market context.
              </p>
              <p className="text-sm font-medium text-rose-100/90">Most traders lose money from bad entries, poor execution, lack of discipline, and no market structure. This solves all four.</p>
              <p className="text-sm font-medium text-zinc-400">Most traders choose this option</p>
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-black/35 p-5 md:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">Everything you need to trade properly</p>
            <div className="mb-2 mt-4 space-y-3">
              <p className="text-base font-semibold text-white md:text-[1.05rem]">A complete system removes emotion — and gives you control over every trade.</p>
              <p className="text-sm leading-7 text-zinc-200/80">Built to help you stay consistent — and move toward your payout with control.</p>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4 md:p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex min-h-[84px] flex-col justify-center rounded-xl border border-white/10 bg-zinc-950/50 px-5 py-4">
                  <span className="text-sm font-semibold text-emerald-200">Entry</span>
                  <span className="mt-1.5 text-base leading-6 text-zinc-100">GG SMI Precision</span>
                </div>
                <div className="flex min-h-[84px] flex-col justify-center rounded-xl border border-white/10 bg-zinc-950/50 px-5 py-4">
                  <span className="text-sm font-semibold text-emerald-200">Execution</span>
                  <span className="mt-1.5 text-base leading-6 text-zinc-100">GG RR Trade Panel</span>
                </div>
                <div className="flex min-h-[84px] flex-col justify-center rounded-xl border border-white/10 bg-zinc-950/50 px-5 py-4">
                  <span className="text-sm font-semibold text-emerald-200">Protection</span>
                  <span className="mt-1.5 text-base leading-6 text-zinc-100">GG Daily Account Lock</span>
                </div>
                <div className="flex min-h-[84px] flex-col justify-center rounded-xl border border-white/10 bg-zinc-950/50 px-5 py-4">
                  <span className="text-sm font-semibold text-emerald-200">Structure</span>
                  <span className="mt-1.5 text-base leading-6 text-zinc-100">GG Session High/Low Indicator</span>
                </div>
              </div>
            </div>
            {showIntegratedBenefits ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950/45 p-4 md:p-5">
                <p className="text-sm font-semibold text-white">Why traders choose the bundle</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-black/30 px-5 py-5 text-[15px] leading-7 text-zinc-100">Know your risk and reward before every trade</div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-5 py-5 text-[15px] leading-7 text-zinc-100">Execute faster with visual trade planning</div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-5 py-5 text-[15px] leading-7 text-zinc-100">Prevent overtrading after your session is done</div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-5 py-5 text-[15px] leading-7 text-zinc-100">Read momentum and market structure together</div>
                  <div className="rounded-xl border border-white/10 bg-black/30 px-5 py-5 text-[15px] leading-7 text-zinc-100 md:col-span-2">Change your stop mid-trade and instantly see your exact dollar risk — no guessing</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex h-full flex-col rounded-[1.75rem] border border-white/10 bg-black/60 p-6 shadow-[0_0_32px_rgba(255,255,255,0.03)]">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-400">Total value: ${individualTotal}</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <p className="text-5xl font-semibold text-white">${bundle.price}</p>
            <p className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-300 shadow-[0_0_22px_rgba(74,222,128,0.18)]">
              {bundle.savingsLabel}
            </p>
          </div>
          <p className="mt-3 text-sm font-medium text-emerald-200">Save ${bundle.savings} — get the full system at a discounted bundle price</p>
          <p className="mt-2 text-sm font-medium text-zinc-200">Most traders choose this option</p>
          <p className="mt-3 text-sm leading-7 text-zinc-300">
            One bundle for entries, execution, structure, and protection.
          </p>
          <p className="mt-3 text-sm font-medium text-zinc-200">Includes lifetime updates and ongoing improvements for all tools.</p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/50 px-4 py-4">
            <p className="text-sm font-semibold text-white">Includes:</p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>GG RR Trade Panel</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>GG Daily Account Lock AddOn</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>GG Session High/Low Indicator</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>GG SMI Precision</span>
              </li>
            </ul>
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-zinc-950/60 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Bundle price</p>
            <p className="mt-2 text-2xl font-semibold text-white">${bundle.price}</p>
          </div>
          <div className="relative z-20 mt-6 space-y-3 pointer-events-auto">
            {showPurchase ? (
              <>
                <BuyButton
                  productName={bundle.name}
                  productId={bundle.id}
                  priceIdEnv={bundle.stripePriceEnv}
                  label="Get the Full Trading System – Instant Access"
                  helperText="Start trading with structure today"
                  className="py-4 text-base"
                  showCoupon={showCoupon}
                />
                <p className="text-center text-sm font-medium text-zinc-300/80">Limited-time bundle price — may increase soon</p>
                <p className="text-center text-xs font-medium text-zinc-400/80">Buying separately costs $646</p>
                <p className="text-center text-sm font-medium text-emerald-100/80">Used daily by active futures traders</p>
                {showTrustBadges ? <PaymentTrust /> : null}
              </>
            ) : (
              <Link
                href="/bundle"
                className="inline-flex w-full items-center justify-center rounded-full border border-emerald-200/50 bg-emerald-300 px-6 py-4 text-base font-semibold text-black shadow-[0_0_30px_rgba(74,222,128,0.32)] transition hover:-translate-y-0.5 hover:bg-emerald-200 hover:shadow-[0_0_40px_rgba(74,222,128,0.42)]"
              >
                View Bundle
              </Link>
            )}
            {!showPurchase && showTrustBadges ? <PaymentTrust /> : null}
            <p className="text-center text-sm font-medium text-zinc-200">One-time payment. Lifetime access.</p>
            {showDetailsLink ? (
              <Link
                href="/bundle"
                className="inline-flex w-full items-center justify-center rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/5"
              >
                View Bundle Details
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}


