import Link from "next/link";
import { BundleCard } from "@/components/BundleCard";
import { ProductCard } from "@/components/ProductCard";
import { TestimonialSlider } from "@/components/TestimonialSlider";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { benefits, faqs, testimonials, whyChooseUs } from "@/lib/content";
import { products } from "@/lib/products";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata.home;

export default function HomePage() {
  const trustItems = [
    { title: "Instant Download", detail: "Immediate access after checkout", icon: "DL" },
    { title: "Secure Payment", detail: "PayPal or card checkout", icon: "SC" },
    { title: "NinjaTrader 8 Compatible", detail: "Built specifically for NT8 workflows", icon: "NT" },
    { title: "Built for Futures Traders", detail: "Focused on live execution and risk", icon: "F" }
  ];
  const socialProof = [
    { value: "1,000+", label: "Trusted by traders" },
    { value: "4.8★", label: "Trader rating" },
    { value: "200+", label: "Positive reviews" },
    { value: "Daily", label: "Used by active NinjaTrader traders" }
  ];
  const authorityPoints = [
    "Built by traders, for traders",
    "Designed from real futures trading experience",
    "Tested in real trading conditions"
  ];
  const outcomePoints = [
    "Trade with more clarity",
    "Reduce mistakes",
    "Execute faster with confidence",
    "Remove hesitation from your trading"
  ];
  const systemPoints = [
    "Complete NinjaTrader execution system",
    "Build a structured trading workflow",
    "Tools designed to work together"
  ];
  const heroStats = [
    {
      prefix: "Cleaner ",
      highlight: "Entries",
      suffix: "",
      valueClassName: "text-[2rem] leading-tight lg:text-[2.35rem]",
      label: "Plan trades with better structure before you execute."
    },
    {
      prefix: "Better ",
      highlight: "Risk",
      suffix: " Control",
      valueClassName: "text-[2rem] leading-tight lg:text-[2.35rem]",
      label: "Manage stops, targets, and daily limits with more discipline."
    },
    {
      prefix: "Trade ",
      highlight: "Smarter",
      suffix: "",
      valueClassName: "text-[2rem] leading-tight lg:text-[2.35rem]",
      label: "Better entries. Better decisions. Better execution."
    }
  ];

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(52,211,153,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.06),_transparent_26%)]" />
        <div className="absolute inset-y-0 left-0 w-[58%] bg-[linear-gradient(90deg,rgba(0,0,0,0.44),rgba(0,0,0,0.18),transparent)]" />
        <Container className="relative space-y-12 py-28 md:py-36">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="space-y-8">
            <div className="space-y-4">
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-200">
                Premium NinjaTrader 8 Tools
              </span>
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white md:text-6xl lg:text-7xl">
                Execute Trades With <span className="bg-[linear-gradient(180deg,#bbf7d0,#4ade80)] bg-clip-text text-transparent">Precision</span>. Control Risk Like a Pro.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-zinc-400">
                Advanced NinjaTrader 8 tools for traders who want cleaner entries, better risk management, and consistent execution.
              </p>
              <div className="flex flex-wrap gap-3">
                {socialProof.map((item) => (
                  <div key={item.label} className="rounded-full border border-white/10 bg-black/35 px-4 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
                    <span className="bg-[linear-gradient(180deg,#d9f99d,#4ade80)] bg-clip-text text-lg font-semibold text-transparent drop-shadow-[0_0_16px_rgba(74,222,128,0.3)]">
                      {item.value}
                    </span>
                    <span className="ml-2 text-sm text-zinc-500">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 inline-flex flex-col items-start gap-2">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full border border-emerald-100/60 bg-emerald-300 px-10 py-5 text-xl font-semibold text-black shadow-[0_0_46px_rgba(74,222,128,0.46)] transition duration-200 hover:scale-[1.02] hover:bg-emerald-200 hover:shadow-[0_0_66px_rgba(74,222,128,0.58)]"
              >
                View Products &amp; Pricing
              </Link>
              <p className="text-base font-medium text-zinc-50">One-time payment • Lifetime access</p>
              <p className="max-w-xl text-sm leading-7 text-zinc-300">Instant digital delivery. Your license key and download access are sent by email after purchase.</p>
              <p className="text-sm leading-7 text-zinc-400">All tools are built for NinjaTrader 8 and require NinjaTrader 8 to use.</p>
            </div>

            </div>

            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.18)]">
              <div className="rounded-[1.5rem] border border-white/10 bg-black/55 p-5 shadow-[0_0_18px_rgba(255,255,255,0.02)]">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Execution Suite</p>
                    <p className="mt-1 text-xl font-semibold text-white">Trade with more <span className="text-emerald-300">structure</span></p>
                  </div>
                  <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.55)]" />
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {[
                    "On-chart risk-reward planning",
                    "Manual account safety lockout",
                    "Asia, London, New York levels",
                    "Momentum confirmation with SMI"
                  ].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4 text-sm text-zinc-300">
                      {item}
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid gap-3">
                  {authorityPoints.map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-9 lg:grid-cols-3 lg:gap-14">
            {heroStats.map((stat) => (
              <article
                key={`${stat.prefix}${stat.highlight}${stat.suffix}`}
                className="flex min-h-[240px] flex-col justify-between rounded-3xl border border-emerald-400/12 bg-zinc-950/80 p-10 shadow-[0_0_24px_rgba(255,255,255,0.02),0_0_24px_rgba(74,222,128,0.03)] transition duration-200 hover:border-emerald-400/24 hover:shadow-[0_0_24px_rgba(255,255,255,0.02),0_0_34px_rgba(74,222,128,0.1)]"
              >
                <div className="space-y-4">
                  <span className="inline-flex h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(74,222,128,0.4)]" />
                  <p
                    className={`font-bold tracking-tight text-zinc-50 ${stat.valueClassName}`}
                  >
                    {stat.prefix}
                    <span className="bg-[linear-gradient(180deg,#bbf7d0,#4ade80)] bg-clip-text text-transparent">
                      {stat.highlight}
                    </span>
                    {stat.suffix}
                  </p>
                </div>
                <p className="mt-7 text-base leading-8 text-zinc-100">{stat.label}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-18">
        <Container className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {outcomePoints.map((item) => (
              <div key={item} className="rounded-[1.5rem] border border-white/10 bg-black/30 px-5 py-4 text-sm font-medium text-zinc-200 shadow-[0_0_18px_rgba(255,255,255,0.02)]">
                {item}
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {trustItems.map((item, index) => (
              <article key={item.title} className="rounded-[1.75rem] border border-white/10 bg-zinc-950/75 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_0_18px_rgba(255,255,255,0.02)]">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-semibold text-zinc-200">
                    {index === 1 ? "★" : item.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.title}</h3>
                    <p className="mt-1 text-sm text-zinc-500">{item.detail}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-24 pt-10">
        <Container>
          <div className="relative overflow-hidden rounded-[2.15rem] border border-emerald-400/20 bg-[linear-gradient(180deg,rgba(22,22,24,0.97),rgba(8,8,9,0.99))] px-7 py-12 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_0_34px_rgba(74,222,128,0.06)] md:px-10 md:py-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_28%,rgba(52,211,153,0.14),transparent_34%),radial-gradient(circle_at_80%_70%,rgba(52,211,153,0.07),transparent_28%)]" />
            <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="space-y-5">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-200">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-black/30 text-[10px] tracking-normal text-zinc-200">
                    GG
                  </span>
                  Custom Build
                </span>
                <div className="space-y-3">
                  <h2 className="max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
                    Have an idea? We build your indicator or <span className="bg-[linear-gradient(180deg,#d9f99d,#4ade80)] bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(74,222,128,0.24)]">fully automated trading system</span>.
                  </h2>
                  <p className="max-w-2xl text-base leading-7 text-zinc-300">
                    Turn your trading idea into a real NinjaTrader tool — from simple indicators to fully automated systems.
                  </p>
                  <p className="text-base font-medium text-white">Stop trading with limitations — build exactly what you need</p>
                  <p className="text-sm font-medium text-zinc-200">No idea is too complex — we build exactly what you need.</p>
                </div>
              </div>

              <div className="space-y-4 lg:justify-self-end">
                <div className="flex flex-col gap-4 sm:flex-row lg:flex-col xl:flex-row">
                  <Link
                    href="/custom-development"
                    className="inline-flex items-center justify-center rounded-full border border-emerald-200/50 bg-emerald-300 px-9 py-5 text-xl font-semibold text-black shadow-[0_0_40px_rgba(74,222,128,0.38)] transition duration-200 hover:-translate-y-1 hover:bg-emerald-200 hover:shadow-[0_0_52px_rgba(74,222,128,0.48)]"
                  >
                    Build My Strategy
                  </Link>
                  <Link
                    href="/custom-development"
                    className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/7 px-9 py-5 text-xl font-semibold text-white shadow-[0_0_26px_rgba(255,255,255,0.04)] transition duration-200 hover:-translate-y-1 hover:border-emerald-300/25 hover:bg-white/10"
                  >
                    Build My Indicator
                  </Link>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-white">Limited development slots available each month</p>
                  <p className="text-sm font-medium text-zinc-500">Confidential • Fast turnaround • Built for real trading</p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-28">
        <Container className="space-y-12">
          <SectionHeading
            eyebrow="Featured Products"
            title="A complete NinjaTrader execution system for traders who want structure"
            description="Start with one tool or build a structured trading workflow with products designed to work together."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {systemPoints.map((item) => (
              <div key={item} className="rounded-[1.5rem] border border-white/10 bg-zinc-950/70 px-5 py-4 text-sm font-medium text-zinc-200 shadow-[0_0_18px_rgba(255,255,255,0.02)]">
                {item}
              </div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {products.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-emerald-400/20 bg-zinc-950/75 px-8 py-10 text-center shadow-[0_0_24px_rgba(74,222,128,0.06)]">
            <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">Bundle Option</p>
            <h3 className="mt-4 text-3xl font-semibold text-white md:text-4xl">Most traders choose the complete system</h3>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-300">
              Everything you need for entries, execution, discipline, and structure — in one complete system.
            </p>
            <div className="mt-6">
              <Link
                href="/bundle"
                className="inline-flex items-center justify-center rounded-full border border-emerald-200/50 bg-emerald-300 px-7 py-4 text-base font-semibold text-black shadow-[0_0_34px_rgba(74,222,128,0.34)] transition hover:-translate-y-0.5 hover:bg-emerald-200 hover:shadow-[0_0_44px_rgba(74,222,128,0.44)]"
              >
                Get the Full Trading System – Save $247
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-y border-white/10 bg-zinc-950/40 py-28">
        <Container className="space-y-12">
          <div className="flex flex-col gap-4 text-left items-start">
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-200">
              Benefits
            </span>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Built to keep your chart focused and your workflow <span className="text-emerald-300">fast</span>
              </h2>
              <p className="max-w-3xl text-base leading-7 text-zinc-400 md:text-lg">
                Every screen and interaction is designed around practical futures trading behavior.
              </p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {benefits.map((benefit) => (
              <article key={benefit.title} className="rounded-[2rem] border border-white/10 bg-black/50 p-6 shadow-[0_0_22px_rgba(255,255,255,0.02)]">
                <h3 className="text-xl font-semibold text-white">{benefit.title}</h3>
                <p className="mt-4 text-sm leading-7 text-zinc-500">{benefit.description}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-28">
        <Container className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="space-y-6">
            <SectionHeading
              eyebrow="Why Traders Choose Good Gains"
              title="Professional-grade tools with a sharper, cleaner trading aesthetic"
              description="Designed for futures traders who want software that feels deliberate, not bloated."
            />
          </div>
          <div className="grid gap-4">
            {whyChooseUs.map((item) => (
              <div key={item} className="rounded-[1.5rem] border border-white/10 bg-zinc-950/75 px-5 py-5 text-sm text-zinc-300 shadow-[0_0_18px_rgba(255,255,255,0.02)]">
                {item}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-white/10 bg-zinc-950/45 py-28">
        <Container className="space-y-12">
          <SectionHeading
            eyebrow="Testimonials"
            title="Trusted by active futures traders"
            description="Real feedback from traders using Good Gains tools daily"
          />
          <div className="grid gap-4 md:grid-cols-4">
            {socialProof.map((item) => (
              <div key={item.label} className="rounded-[1.5rem] border border-white/10 bg-zinc-950/75 p-6 text-center shadow-[0_0_18px_rgba(255,255,255,0.02)]">
                <p className="bg-[linear-gradient(180deg,#d9f99d,#4ade80)] bg-clip-text text-4xl font-semibold text-transparent drop-shadow-[0_0_14px_rgba(74,222,128,0.25)]">
                  {item.value}
                </p>
                <p className="mt-2 text-sm text-zinc-500">{item.label}</p>
              </div>
            ))}
          </div>
          <TestimonialSlider testimonials={testimonials} />
        </Container>
      </section>

      <section className="py-28">
        <Container>
          <BundleCard showPurchase={false} showTrustBadges={false} />
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6 shadow-[0_0_24px_rgba(255,255,255,0.02)] md:p-8">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
                    Coming Soon
                  </span>
                </div>
                <div className="space-y-3">
                  <h3 className="text-3xl font-semibold text-white md:text-4xl">Copy Trader (Coming Soon)</h3>
                  <p className="max-w-2xl text-base leading-7 text-zinc-300">
                    Copy trades across multiple accounts with precision and control.
                  </p>
                  <p className="text-sm font-medium text-zinc-200">Coming soon – early access available</p>
                  <p className="text-sm font-medium text-white">Join early access before release</p>
                </div>
                <ul className="grid gap-3 text-sm text-zinc-200 sm:grid-cols-2">
                  {[
                    "Copy trades from one account to multiple accounts",
                    "Real-time execution",
                    "Built for NinjaTrader 8",
                    "Fast and reliable performance"
                  ].map((feature) => (
                    <li key={feature} className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3">
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-black/40 p-6">
                <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Early Access</p>
                <p className="mt-3 text-2xl font-semibold text-white">Be first in line when Copy Trader launches.</p>
                <p className="mt-3 text-sm leading-7 text-zinc-400">
                  Join the list to hear when early access opens for traders who want multi-account execution built around speed and control.
                </p>
                <div className="mt-6 space-y-2">
                  <Link
                    href="/support?topic=copy-trader-early-access#message-form"
                    className="inline-flex w-full items-center justify-center rounded-full border border-emerald-200/50 bg-emerald-300 px-6 py-4 text-base font-semibold text-black shadow-[0_0_30px_rgba(74,222,128,0.3)] transition hover:-translate-y-0.5 hover:bg-emerald-200 hover:shadow-[0_0_40px_rgba(74,222,128,0.4)]"
                  >
                    Join Early Access
                  </Link>
                  <p className="text-center text-xs font-medium text-zinc-400">Be the first to get access when released</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-5">
              <p className="text-sm font-semibold text-white">More tools coming soon</p>
              <p className="mt-2 text-sm leading-7 text-zinc-400">Position Good Gains as a growing toolkit, not a one-product storefront.</p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 p-5">
              <p className="text-sm font-semibold text-white">Future updates included</p>
              <p className="mt-2 text-sm leading-7 text-zinc-400">Increase perceived value by showing the toolkit is intended to keep improving over time.</p>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-y border-white/10 bg-zinc-950/40 py-28">
        <Container className="space-y-12">
          <SectionHeading
            eyebrow="FAQ Preview"
            title="A quick look at common questions before you buy"
            description="A full FAQ page is also included in the site structure."
          />
          <div className="grid gap-5">
            {faqs.slice(0, 3).map((faq) => (
              <article key={faq.question} className="rounded-[1.5rem] border border-white/10 bg-black/50 p-6">
                <h3 className="text-lg font-semibold text-white">{faq.question}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{faq.answer}</p>
              </article>
            ))}
          </div>
          <div>
            <Link href="/faq" className="text-sm font-semibold text-white transition hover:text-emerald-200">
              View all FAQs
            </Link>
          </div>
        </Container>
      </section>

      <section className="py-28">
        <Container>
          <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.16),_rgba(0,0,0,0.92)_52%)] px-8 py-12 text-center">
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Final CTA</p>
            <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">Upgrade your NinjaTrader workflow with <span className="text-emerald-300">sharper tools</span>.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-400">
              Explore the full Good Gains collection, compare pricing, and prepare the site for live Stripe checkout whenever you&apos;re ready.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <span className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-zinc-200">Built by traders, for traders</span>
              <span className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-zinc-200">Fast trader support</span>
              <span className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-zinc-200">Future updates included</span>
            </div>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <div className="space-y-2">
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-full border border-emerald-200/50 bg-emerald-300 px-7 py-4 text-base font-semibold text-black shadow-[0_0_34px_rgba(74,222,128,0.34)] transition hover:-translate-y-0.5 hover:bg-emerald-200 hover:shadow-[0_0_44px_rgba(74,222,128,0.44)]"
                >
                  Start Trading Smarter
                </Link>
                <p className="text-xs font-medium text-emerald-200">Start trading smarter today</p>
              </div>
              <div className="space-y-2">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-4 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:border-emerald-300/30 hover:bg-white/10"
                >
                  View All Indicators
                </Link>
                <p className="text-xs font-medium text-zinc-500">Get instant access now</p>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}


