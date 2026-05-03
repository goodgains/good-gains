import type { Route } from "next";
import Link from "next/link";
import { BuyButton } from "@/components/BuyButton";
import { PaymentTrust } from "@/components/PaymentTrust";
import { ProductMediaShowcase } from "@/components/ProductMediaShowcase";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { bundle, BundleViewer, getProductDeviceSavings, Product, products } from "@/lib/products";

type ProductDetailProps =
  | {
      product: Product;
      bundleView?: never;
    }
  | {
      product?: never;
      bundleView: BundleViewer;
    };

function ProductSwitcher({ items }: { items: { href: Route; key: string; title: string; description: string; isCurrent: boolean }[] }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5">
      <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Other tools</p>
      <p className="mt-2 text-lg font-semibold text-white">Quick product switching</p>
      <p className="mt-2 text-sm leading-7 text-zinc-400">Compare tools and move through the full lineup without leaving the product flow.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`block rounded-2xl border px-4 py-4 transition ${
              item.isCurrent
                ? "border-emerald-400/30 bg-emerald-400/8"
                : "border-white/10 bg-black/30 hover:border-white/15 hover:bg-black/40"
            }`}
          >
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-1 text-sm text-zinc-400">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ProductDetail({ product, bundleView }: ProductDetailProps) {
  const isBundleView = Boolean(bundleView);
  const currentProduct = product ?? null;
  const isRrPanel = currentProduct?.slug === "gg-rr-trade-panel";
  const isDailyAccountLock = currentProduct?.slug === "daily-account-lock-addon";
  const isSmiPrecision = currentProduct?.slug === "gg-stochastic-momentum-index";
  const isSessionHighLow = currentProduct?.slug === "session-high-low-indicator";

  const whatYouGetBySlug: Record<string, string[]> = {
    "gg-rr-trade-panel": ["Full risk-reward planning panel", "Visual TP/SL zones on chart", "Live sync with orders", "Fast trade management tools"],
    "daily-account-lock-addon": ["Lock trading instantly", "Block new entries", "Flatten all positions", "Prevent overtrading"],
    "session-high-low-indicator": [
      "Auto-marked Asia, London & New York session levels",
      "Clear session structure directly on chart",
      "Understand where liquidity is building"
    ],
    "gg-stochastic-momentum-index": ["Momentum confirmation signals", "Overbought/oversold context", "Cleaner entry timing"]
  };

  const bundleWhatYouGet = [
    "GG SMI Precision — entries",
    "GG RR Trade Panel — execution",
    "GG Daily Account Lock — discipline",
    "GG Session High/Low — structure"
  ];

  const bundleFeatures = [
    "Enter trades with confidence",
    "Execute with precision",
    "Prevent overtrading and losses",
    "Trade with clear market structure",
    "Build a complete trading workflow"
  ];

  const bundleIdealFor = [
    "Traders who want one complete workflow instead of disconnected tools",
    "Active futures traders who need better entries, execution, and protection",
    "Anyone serious about building a more consistent trading system"
  ];

  const currentName = bundleView?.name ?? currentProduct!.name;
  const currentCategory = bundleView?.category ?? currentProduct!.category;
  const currentDescription = bundleView?.description ?? currentProduct!.description;
  const currentBenefitLine = bundleView?.benefitLine ?? currentProduct!.benefitLine;
  const currentPrice = bundleView?.price ?? currentProduct!.price;
  const currentPriceEnv = bundleView?.stripePriceEnv ?? currentProduct!.stripePriceEnv;
  const currentId = bundleView?.id ?? currentProduct!.slug;
  const deviceSavings = currentProduct ? getProductDeviceSavings(currentProduct) : 0;
  const whatYouGet = bundleView ? bundleWhatYouGet : whatYouGetBySlug[currentProduct!.slug] ?? currentProduct!.quickBullets;
  const includedFeatures = bundleView ? bundleFeatures : currentProduct!.features;
  const idealFor = bundleView ? bundleIdealFor : currentProduct!.idealFor;

  const heroTitle = isBundleView
    ? "Complete Trading System for Precision, Execution & Protection"
    : isRrPanel
    ? "Know exactly how much you're risking — before and during every trade"
    : isDailyAccountLock
      ? "Lock your day. Protect your account from yourself."
    : isSessionHighLow
      ? "Mark Asia, London & New York Levels Before the Move Happens"
    : isSmiPrecision
      ? "Spot reversals before the crowd"
      : currentName;
  const heroDescription = isBundleView
    ? "Everything you need to trade with structure — enter better, execute faster, protect your profits, and understand the market context."
    : isRrPanel
    ? "Plan entries, stop loss, and take profit visually - with real-time PnL before you even enter."
    : isDailyAccountLock
      ? "Automatically block trading after your session ends — no emotions, no revenge trading."
    : isSessionHighLow
      ? "Automatically plot key session levels so you can spot liquidity, reactions, and structure in real time."
    : isSmiPrecision
      ? "See momentum shift BEFORE price reacts — and stop entering trades too late."
      : currentDescription;
  const heroBenefitLine = isRrPanel ? "Visual trade management in real time" : currentBenefitLine;
  const showHeroBenefitLine = !isBundleView && !isSmiPrecision && !isDailyAccountLock;

  const navigationItems = [
    ...products.map((item) => ({
      href: `/products/${item.slug}` as Route,
      key: item.slug,
      title: item.name,
      description: item.shortDescription,
      isCurrent: !isBundleView && item.slug === currentProduct?.slug
    })),
    {
      href: `/products/${bundle.slug}` as Route,
      key: bundle.slug,
      title: bundle.name,
      description: "All 4 products together with bundle savings, one checkout flow, and coupon support.",
      isCurrent: isBundleView
    }
  ];

  const purchaseLabel = bundleView
    ? "Get the Full Trading System – Instant Access"
    : isSmiPrecision
      ? "Get GG SMI Precision – Instant Access"
      : isDailyAccountLock
        ? "Get GG Daily Account Lock – Instant Access"
        : "Buy Now - Instant Access";
  const purchaseHelperText = bundleView
    ? "Instant access to the full trading workflow"
    : isSmiPrecision || isDailyAccountLock
      ? "Lifetime updates + ongoing improvements"
      : "Start trading smarter today";
  const purchaseDescription = bundleView
    ? "Get all four Good Gains tools in one bundle built to improve entries, execution, and protection inside NinjaTrader 8."
    : isDailyAccountLock
      ? "Instant download for NinjaTrader 8. Lock your day, block new trades, and protect profits after your session ends."
    : isSmiPrecision
      ? "Instant download for NinjaTrader 8 with a clean momentum workflow for reversals, confirmations, and continuation setups."
      : "Prepared for PayPal and Paddle checkout, responsive purchase flow, and license verification support.";

  const purchaseCard = (
    <div className="rounded-[2rem] border border-white/10 bg-zinc-950/85 p-6">
      <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">{bundleView ? "Complete trading system" : "Single product license"}</p>
      {bundleView ? <p className="mt-3 text-sm font-medium text-emerald-200">Total value: $646</p> : null}
      <p className="mt-3 text-5xl font-semibold text-white">{bundleView ? `$${currentPrice}` : `From $${currentPrice}`}</p>
      {!bundleView && currentProduct ? (
        <div className="mt-4 grid gap-2">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-200">
            <div>
              <span className="font-semibold text-white">1 Device</span>
              <p className="mt-1 text-xs leading-6 text-zinc-500">Limited to one computer</p>
            </div>
            <span className="font-semibold text-white">${currentProduct.price}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-300">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">2 Devices</span>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                  Best Value
                </span>
              </div>
              <p className="mt-1 text-xs leading-6 text-zinc-500">Perfect if you trade from multiple setups</p>
              <p className="text-xs leading-6 text-emerald-200/90">Save ${deviceSavings} when trading from multiple setups</p>
            </div>
            <span className="font-semibold text-white">${currentProduct.twoDevicePrice}</span>
          </div>
          {!bundleView ? (
            <p className="text-xs leading-6 text-zinc-400">
              Choose 1 or 2 devices below. Bundle checkout remains 1 device and can be upgraded later.
            </p>
          ) : null}
        </div>
      ) : null}
      <p className="mt-4 text-sm leading-7 text-zinc-300">{purchaseDescription}</p>
      {bundleView ? (
        <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-4 text-sm text-zinc-200">
          <p className="font-semibold text-white">4 tools included</p>
          <p className="mt-2 text-zinc-300">RR Trade Panel - Daily Account Lock - Session High/Low - SMI</p>
          <p className="mt-1 text-emerald-200">Save $247 — get the full system at a discounted bundle price</p>
        </div>
      ) : null}
      {bundleView ? <p className="mt-3 text-sm font-medium text-zinc-100">Most traders choose this option</p> : null}
      <p className="mt-3 text-sm font-medium text-zinc-200">One-time payment - Lifetime updates + ongoing improvements</p>
      <p className="mt-3 text-sm leading-7 text-zinc-300">Instant digital delivery. Your license key and download access are sent by email after purchase.</p>
      <p className="mt-2 text-sm leading-7 text-zinc-400">All tools are built for NinjaTrader 8 and require NinjaTrader 8 to use.</p>
      {isDailyAccountLock ? (
        <p className="mt-4 text-center text-sm font-medium text-emerald-100/80">Used daily by traders to prevent overtrading and protect profits</p>
      ) : null}
      <div className="relative z-20 mt-6 pointer-events-auto">
        <BuyButton
          productName={currentName}
          productId={currentId}
          priceIdEnv={currentPriceEnv}
          allowTwoDeviceOption={!bundleView}
          label={purchaseLabel}
          helperText={purchaseHelperText}
          showCoupon
        />
        {bundleView ? <p className="mt-4 text-center text-sm font-medium text-emerald-100/80">Used daily by active futures traders</p> : null}
        {isDailyAccountLock ? (
          <p className="mt-4 text-center text-sm font-medium text-zinc-200">Instant protection. No second chances.</p>
        ) : null}
        <PaymentTrust />
      </div>
    </div>
  );

  if (isRrPanel && currentProduct) {
    return (
      <div className="py-12 md:py-16">
        <Container className="space-y-8">
          <div className="relative">
            <div className="space-y-6 xl:pr-[392px]">
              <div className="space-y-4">
                <Badge>{currentCategory}</Badge>
                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl">{heroTitle}</h1>
                <p className="max-w-4xl text-lg leading-8 text-zinc-300">{heroDescription}</p>
                <p className="max-w-4xl text-lg font-semibold leading-8 text-white">{heroBenefitLine}</p>
                <p className="text-sm font-medium text-emerald-200">Start improving your execution today.</p>
              </div>
              <article className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6 shadow-[0_0_24px_rgba(74,222,128,0.05)] md:p-8">
                <p className="text-2xl font-semibold text-white">See your exact risk in real time</p>
                <p className="mt-3 text-base leading-7 text-zinc-300">Know exactly how much you're risking — and how much you can make — before you enter.</p>
                <div className="mx-auto mt-5 w-full max-w-[1100px] overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/45 p-3 md:p-4">
                  <video
                    src="/videos/rr-trade-demo.mp4"
                    controls
                    playsInline
                    style={{ width: "100%", height: "auto", objectFit: "contain", borderRadius: "16px", display: "block" }}
                  />
                </div>
                <p className="mt-4 text-base leading-7 text-zinc-300">Move your stop — and instantly see how your risk changes.</p>
                <p className="mt-2 text-sm font-medium text-zinc-400">Click play to watch the full 38-second demo.</p>
              </article>
            </div>
            <aside className="mt-8 space-y-5 xl:absolute xl:right-0 xl:top-0 xl:mt-0 xl:w-[360px]">{purchaseCard}</aside>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
              <h2 className="text-2xl font-semibold text-white">What you get</h2>
              <ul className="mt-6 grid gap-4">
                {whatYouGet.map((item) => (
                  <li key={item} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm text-zinc-200">{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
              <h2 className="text-2xl font-semibold text-white">Included features</h2>
              <ul className="mt-6 grid gap-4">
                {includedFeatures.map((feature) => (
                  <li key={feature} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm text-zinc-200">{feature}</li>
                ))}
              </ul>
            </div>
          </div>
          <ProductMediaShowcase product={currentProduct} />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
              <h2 className="text-2xl font-semibold text-white">Lifetime Updates</h2>
              <p className="mt-4 text-base leading-8 text-zinc-300">Every purchase includes lifetime updates, continuous improvements, bug fixes, and new features. We actively develop and improve our tools over time.</p>
              <p className="mt-4 text-sm font-medium text-zinc-200">You're not buying a static product - you're getting a tool that keeps improving.</p>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
              <h2 className="text-2xl font-semibold text-white">Ideal for</h2>
              <ul className="mt-6 space-y-3 text-sm text-zinc-300">
                {idealFor.map((item) => (
                  <li key={item} className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><span>{item}</span></li>
                ))}
              </ul>
            </div>
          </div>
          <ProductSwitcher items={navigationItems} />
        </Container>
      </div>
    );
  }

  if (isSmiPrecision && currentProduct) {
    return (
      <div className="py-10 md:py-12">
        <Container className="!max-w-[1360px] space-y-5 md:space-y-6">
          <div className="relative">
            <div className="space-y-5 xl:pr-[352px]">
              <div className="space-y-4">
                <Badge>{currentCategory}</Badge>
                <h1 className="max-w-5xl text-4xl font-semibold tracking-tight text-white md:text-5xl">{heroTitle}</h1>
                <p className="max-w-5xl text-lg leading-8 text-zinc-300">{heroDescription}</p>
                <p className="max-w-5xl pt-1 text-base font-medium leading-7 text-emerald-100/90">Most traders enter too late. GG SMI Precision shows the shift before the move.</p>
              </div>
              <ProductMediaShowcase product={currentProduct} />
            </div>
            <aside className="mt-8 space-y-5 xl:absolute xl:right-0 xl:top-0 xl:mt-0 xl:w-[320px]">{purchaseCard}</aside>
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
              <h2 className="text-2xl font-semibold text-white">Lifetime Updates</h2>
              <p className="mt-4 text-base leading-8 text-zinc-300">Every purchase includes lifetime updates, continuous improvements, bug fixes, and new features. We actively develop and improve our tools over time.</p>
              <p className="mt-4 text-sm font-medium text-zinc-200">You're not buying a static product - you're getting a tool that keeps improving.</p>
            </div>
            <ProductSwitcher items={navigationItems} />
          </div>
        </Container>
      </div>
    );
  }

  if (isDailyAccountLock && currentProduct) {
    return (
      <div className="py-10 md:py-12">
        <Container className="!max-w-[1360px] space-y-6 md:space-y-7">
          <div className="relative">
            <div className="space-y-6 xl:pr-[352px]">
              <div className="space-y-4">
                <Badge>{currentCategory}</Badge>
                <h1 className="max-w-5xl text-4xl font-semibold tracking-tight text-white md:text-5xl">{heroTitle}</h1>
                <p className="max-w-5xl text-lg leading-8 text-zinc-300">{heroDescription}</p>
                <p className="max-w-5xl pt-1 text-base font-medium leading-7 text-rose-100/90">One bad session can wipe your account. This stops it.</p>
              </div>
              <ProductMediaShowcase product={currentProduct} />
            </div>
            <aside className="mt-8 space-y-5 xl:absolute xl:right-0 xl:top-0 xl:mt-0 xl:w-[320px]">{purchaseCard}</aside>
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
              <h2 className="text-2xl font-semibold text-white">Lifetime Updates</h2>
              <p className="mt-4 text-base leading-8 text-zinc-300">Every purchase includes lifetime updates, continuous improvements, bug fixes, and new features. We actively develop and improve our tools over time.</p>
              <p className="mt-4 text-sm font-medium text-zinc-200">You're not buying a static product - you're getting a discipline tool that keeps improving.</p>
            </div>
            <ProductSwitcher items={navigationItems} />
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="py-12 md:py-16">
      <Container className="space-y-8">
        <div className="relative">
          <div className="space-y-8 lg:pr-[392px]">
          <div className="space-y-4">
            <Badge>{currentCategory}</Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">{heroTitle}</h1>
            <p className="max-w-3xl text-lg leading-8 text-zinc-300">{heroDescription}</p>
            {bundleView ? (
              <>
                <p className="max-w-4xl text-base font-medium leading-7 text-rose-100/90">Most traders lose money from bad entries, poor execution, lack of discipline, and no market structure. This solves all four.</p>
                  <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-5 md:p-6">
                    <div className="mt-5 space-y-3">
                      <p className="text-base font-semibold text-white md:text-[1.05rem]">A complete system removes emotion — and gives you control over every trade.</p>
                      <p className="text-sm leading-7 text-zinc-200/80">Built to help you stay consistent — and move toward your payout with control.</p>
                    </div>
                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/90">Entry</p>
                        <p className="mt-2 text-lg font-semibold leading-7 text-white">GG SMI Precision</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/90">Execution</p>
                        <p className="mt-2 text-lg font-semibold leading-7 text-white">GG RR Trade Panel</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/90">Protection</p>
                        <p className="mt-2 text-lg font-semibold leading-7 text-white">GG Daily Account Lock</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/90">Structure</p>
                        <p className="mt-2 text-lg font-semibold leading-7 text-white">GG Session High/Low Indicator</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            {showHeroBenefitLine ? <p className="max-w-3xl text-lg font-semibold leading-8 text-white">{heroBenefitLine}</p> : null}
            {!bundleView ? (
              <p className="text-sm font-medium text-emerald-200">
                {isSessionHighLow ? "Built for traders who rely on session structure and liquidity reactions." : "Start improving your execution today."}
              </p>
            ) : null}
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
            <h2 className="text-2xl font-semibold text-white">{bundleView ? "Everything you need to trade properly" : "What you get"}</h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {whatYouGet.map((item) => (
                <li key={item} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm text-zinc-200">{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
            <h2 className="text-2xl font-semibold text-white">{bundleView ? "Why traders choose the bundle" : "Included features"}</h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {includedFeatures.map((feature) => (
                <li key={feature} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm text-zinc-200">{feature}</li>
              ))}
            </ul>
          </div>
            {currentProduct ? (
              <ProductMediaShowcase product={currentProduct} />
            ) : (
              <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6 md:p-8">
              <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">System breakdown</p>
                    <h2 className="mt-2 text-3xl font-semibold text-white">Everything working together in one workflow</h2>
                    <p className="mt-3 text-base leading-8 text-zinc-300">Each tool covers a key part of the trading process — entries, execution, structure, and protection.</p>
                  </div>
                  <div className="grid gap-3">
                    {products.map((item) => (
                      <div key={item.slug} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm font-semibold text-white">{item.name}</p>
                          <p className="text-sm font-semibold text-emerald-200">${item.price}</p>
                        </div>
                        <p className="mt-1 text-sm text-zinc-400">{item.shortDescription}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[1.75rem] border border-white/10 bg-black/35 p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">System value</p>
                  <div className="mt-4 space-y-5">
                    <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
                      <p className="text-sm text-zinc-400">Total value</p>
                      <p className="mt-2 text-3xl font-semibold text-white">$646</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
                      <p className="text-sm text-zinc-300">Full system price</p>
                      <p className="mt-2 text-3xl font-semibold text-white">$399</p>
                      <p className="mt-2 text-sm font-medium text-emerald-200">Save $247 — get the full system at a discounted bundle price</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
                      <p className="text-sm font-semibold text-white">Included tools</p>
                      <ul className="mt-3 space-y-2 text-sm leading-7 text-zinc-300">
                        <li>RR Trade Panel</li>
                        <li>Daily Account Lock AddOn</li>
                        <li>Session High/Low Indicator</li>
                        <li>GG SMI Precision</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            )}
          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
            <h2 className="text-2xl font-semibold text-white">Lifetime Updates</h2>
            <p className="mt-4 text-base leading-8 text-zinc-300">Every purchase includes lifetime updates, continuous improvements, bug fixes, and new features. We actively develop and improve our tools over time.</p>
            <p className="mt-4 text-sm font-medium text-zinc-200">You're not buying a static product - you're getting a tool that keeps improving.</p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
            <h2 className="text-2xl font-semibold text-white">Ideal for</h2>
            <ul className="mt-6 space-y-3 text-sm text-zinc-300">
              {idealFor.map((item) => (
                <li key={item} className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><span>{item}</span></li>
              ))}
            </ul>
          </div>
          </div>
          <aside className="mt-8 space-y-5 lg:absolute lg:right-0 lg:top-0 lg:mt-0 lg:w-[360px]">
            {purchaseCard}
            <ProductSwitcher items={navigationItems} />
          </aside>
        </div>
      </Container>
    </div>
  );
}
