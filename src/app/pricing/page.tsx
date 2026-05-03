import type { Route } from "next";
import Link from "next/link";
import { PaymentTrust } from "@/components/PaymentTrust";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { bundle, products } from "@/lib/products";

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Transparent pricing for professional NinjaTrader 8 tools"
        supportLine="Compare tools — or choose the complete trading system."
        description="Choose a single product or maximize value with the Pro Futures Bundle."
      />
      <section className="py-20 md:py-24">
        <Container className="space-y-10">
          <div className="flex flex-col gap-3 rounded-[1.75rem] border border-white/10 bg-zinc-950/70 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-200">Limited-time offer</p>
              <p className="mt-2 text-base font-semibold text-white">No subscription - one-time payment.</p>
            </div>
            <p className="text-sm text-emerald-200">Start improving your execution today with instant-access NinjaTrader 8 tools.</p>
          </div>
          <div className="grid items-stretch gap-6 lg:grid-cols-2 xl:grid-cols-4">
            {products.map((product) => (
              <article key={product.slug} className="flex h-full flex-col rounded-[2rem] border border-white/10 bg-zinc-950/80 p-7 pb-8">
                {product.badge ? (
                  <span className="inline-flex rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                    {product.badge}
                  </span>
                ) : null}
                <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">{product.category}</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">{product.name}</h2>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{product.shortDescription}</p>
                <p className="mt-3 text-base font-semibold leading-7 text-white">{product.benefitLine}</p>
                <div className="mt-auto pt-10">
                  <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Price</p>
                  <p className="mt-2 text-4xl font-semibold text-white">From ${product.price}</p>
                  <div className="mt-4 grid gap-2 text-sm">
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-3 py-3 text-zinc-300">
                      <span>1 Device</span>
                      <span className="font-semibold text-white">${product.price}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-3 text-zinc-100">
                      <div className="flex items-center gap-2">
                        <span>2 Devices</span>
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                          Most Popular
                        </span>
                      </div>
                      <span className="font-semibold text-white">${product.twoDevicePrice}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-medium text-emerald-200">Instant download after purchase</p>
                </div>
                <div className="mt-6">
                  <Link
                    href={`/products/${product.slug}` as Route}
                    className="inline-flex w-full items-center justify-center rounded-full border border-emerald-200/50 bg-emerald-300 px-6 py-4 text-base font-semibold text-black shadow-[0_0_30px_rgba(74,222,128,0.32)] transition hover:-translate-y-0.5 hover:bg-emerald-200 hover:shadow-[0_0_40px_rgba(74,222,128,0.42)]"
                  >
                    View Product
                  </Link>
                  <PaymentTrust />
                </div>
              </article>
            ))}
          </div>

          <article className="overflow-hidden rounded-[2rem] border border-emerald-400/30 bg-[radial-gradient(circle_at_top_left,_rgba(52,211,153,0.18),_rgba(0,0,0,0.94)_52%)] p-7 shadow-[0_0_34px_rgba(74,222,128,0.08)]">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="space-y-5">
                <div className="space-y-3">
                  <p className="text-sm uppercase tracking-[0.22em] text-emerald-300">Limited-time offer</p>
                  <h2 className="text-3xl font-semibold text-white">Most traders choose the complete system</h2>
                  <p className="text-base font-semibold text-white">
                    Instead of buying tools separately, get everything you need for entries, execution, discipline, and market structure in one system.
                  </p>
                </div>
                <div className="rounded-[1.75rem] border border-white/10 bg-black/30 p-5">
                  <p className="text-sm font-semibold text-white">Includes:</p>
                  <ul className="mt-4 grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
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
                <div className="rounded-[1.75rem] border border-emerald-400/20 bg-emerald-400/5 p-5">
                  <p className="text-sm font-semibold text-white">Buying separately:</p>
                  <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                    <li className="flex items-center justify-between gap-4">
                      <span>GG RR Trade Panel</span>
                      <span className="font-medium text-white">$299</span>
                    </li>
                    <li className="flex items-center justify-between gap-4">
                      <span>GG Daily Account Lock</span>
                      <span className="font-medium text-white">$149</span>
                    </li>
                    <li className="flex items-center justify-between gap-4">
                      <span>GG SMI Precision</span>
                      <span className="font-medium text-white">$119</span>
                    </li>
                    <li className="flex items-center justify-between gap-4">
                      <span>GG Session High/Low</span>
                      <span className="font-medium text-white">$79</span>
                    </li>
                    <li className="flex items-center justify-between gap-4 border-t border-white/10 pt-3 text-base">
                      <span className="font-semibold text-white">Total</span>
                      <span className="font-semibold text-white">$646</span>
                    </li>
                  </ul>
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="text-sm font-semibold text-white">Bundle:</p>
                    <p className="mt-2 text-2xl font-semibold text-white">$399</p>
                    <p className="mt-3 text-sm font-medium text-emerald-200">You save $247 instantly.</p>
                    <p className="mt-2 text-sm font-medium text-zinc-200">Buying separately costs $646 — most traders go with the bundle.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-black/55 p-6">
                <p className="text-sm uppercase tracking-[0.22em] text-zinc-400">{bundle.marketingValue}</p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <p className="text-5xl font-semibold text-white">${bundle.price}</p>
                  <p className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-300">
                    {bundle.savingsLabel}
                  </p>
                </div>
                <p className="mt-4 text-sm font-medium text-white">Most traders choose this option</p>
                <div className="mt-6">
                  <Link
                    href="/bundle"
                    className="inline-flex w-full items-center justify-center rounded-full border border-emerald-200/50 bg-emerald-300 px-6 py-4 text-base font-semibold text-black shadow-[0_0_30px_rgba(74,222,128,0.32)] transition hover:-translate-y-0.5 hover:bg-emerald-200 hover:shadow-[0_0_40px_rgba(74,222,128,0.42)]"
                  >
                    Get the Full Trading System – Instant Access
                  </Link>
                  <PaymentTrust />
                </div>
                <p className="mt-4 text-sm font-medium text-zinc-200">One-time payment • Lifetime updates + ongoing improvements</p>
              </div>
            </div>
          </article>
        </Container>
      </section>
    </>
  );
}

