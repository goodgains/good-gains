"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BuyButton } from "@/components/BuyButton";
import { PaymentTrust } from "@/components/PaymentTrust";
import { Product } from "@/lib/products";

type ShowcaseSection = {
  eyebrow: string;
  image: string;
  title: string;
  text: string;
};

const rrPanelSections: ShowcaseSection[] = [
  { eyebrow: "TRADE PLANNING", image: "/images/rr-panel/rr-1.jpg", title: "Plan your trade in seconds — with your exact risk and reward already defined.", text: "Set entry, stop loss, and take profit instantly with a clean visual layout." },
  { eyebrow: "ON-CHART CONTROL", image: "/images/rr-panel/rr-2.jpg", title: "Adjust your trade on the chart", text: "Move stop loss and take profit directly on the chart with full control." },
  { eyebrow: "RISK CLARITY", image: "/images/rr-panel/rr-3.jpg", title: "See real-time risk and reward", text: "Know exactly how much you're risking and how much you can make before entering the trade." },
  { eyebrow: "LIVE MANAGEMENT", image: "/images/rr-panel/rr-4.jpg", title: "Real-time adjustment as you trade", text: "Move your take profit or stop loss and see your risk and reward adjust instantly in real time." },
  { eyebrow: "EXECUTION", image: "/images/rr-panel/rr-5.jpg", title: "Trade with confidence", text: "Execute trades with clarity and precision, without second guessing your risk." }
];

const smiSections: ShowcaseSection[] = [
  {
    eyebrow: "DIVERGENCE",
    image: "/images/smi inicator  pic/smi-2-clean.jpg",
    title: "Catch reversals before they happen",
    text: "When price keeps dropping — but momentum starts rising, that's your early signal."
  },
  {
    eyebrow: "OVERBOUGHT EXHAUSTION",
    image: "/images/smi inicator  pic/smi-3(2).jpg",
    title: "See when buyers are out of fuel",
    text: "Momentum peaks before price collapses. That's where smart traders exit — or go short."
  },
  {
    eyebrow: "CONFIRMATION ENTRY",
    image: "/images/smi inicator  pic/smi-4(2).jpg",
    title: "Stop guessing your entries",
    text: "Wait for confirmation — then enter with precision."
  },
  {
    eyebrow: "MOMENTUM CONTINUATION",
    image: "/images/smi inicator  pic/smi-1-clean.jpg",
    title: "Ride momentum — not noise",
    text: "Stay in strong moves with clear momentum confirmation."
  },
  {
    eyebrow: "TOP REVERSAL",
    image: "/images/smi inicator  pic/smi-7(1).jpg",
    title: "Don't get trapped at the top",
    text: "SMI shows when momentum fades before price breaks down."
  }
];

const dailyAccountLockSections: ShowcaseSection[] = [
  {
    eyebrow: "ONE-CLICK LOCK",
    image: "/images/daily account lock pic/dal-4-clean.jpg",
    title: "Lock your account instantly",
    text: "Instantly block new trades and take control of your session."
  },
  {
    eyebrow: "SESSION PROTECTION",
    image: "/images/daily account lock pic/dal-5-clean.jpg",
    title: "Once locked — trading is completely blocked",
    text: "The system blocks new entries and keeps your account protected for the rest of the day."
  },
  {
    eyebrow: "NINJATRADER ACCESS",
    image: "/images/daily account lock pic/dal-1-clean.jpg",
    title: "Access it directly inside NinjaTrader",
    text: "Open and manage your account lock without leaving your trading environment."
  },
  {
    eyebrow: "ACCOUNT CONTROL",
    image: "/images/daily account lock pic/dal-2-clean.jpg",
    title: "Full control over every account",
    text: "Lock specific accounts instantly and monitor their state in real time."
  },
  {
    eyebrow: "LOCK STATUS",
    image: "/images/daily account lock pic/dal-3-clean.jpg",
    title: "Clear locked status — no mistakes",
    text: "Visual confirmation ensures you know exactly when trading is disabled."
  }
];

function ProductLightbox({ image, title, onClose }: { image: string; title: string; onClose: () => void }) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 px-4 py-6 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="relative w-full max-w-6xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_0_80px_rgba(0,0,0,0.45)]" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/60 text-lg font-semibold text-white transition hover:border-white/20 hover:bg-black/75" aria-label="Close image">
          ×
        </button>
        <div className="relative max-h-[82vh] w-full overflow-auto bg-black p-4 md:p-6">
          <Image src={image} alt={title} width={1800} height={1200} className="h-auto w-full object-contain object-center" sizes="100vw" priority />
        </div>
      </div>
    </div>
  );
}

function RrPanelSectionCard({ productName, section, priority, onOpen }: { productName: string; section: ShowcaseSection; priority?: boolean; onOpen: (section: ShowcaseSection) => void }) {
  return (
    <article className="mx-auto w-full max-w-6xl overflow-hidden rounded-[1.9rem] border border-white/10 bg-black/35 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_34px_rgba(74,222,128,0.05)]">
      <button type="button" onClick={() => onOpen(section)} className="group block w-full cursor-pointer text-left" aria-label={`Open larger view for ${section.title}`}>
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.14),_rgba(0,0,0,0.96)_58%)]">
          <Image src={section.image} alt={`${productName} ${section.title}`} fill className="object-cover transition duration-300 group-hover:scale-[1.02]" sizes="(max-width: 1200px) 100vw, 1100px" priority={priority} />
          <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-100">Click to enlarge</div>
        </div>
      </button>
      <div className="space-y-3 px-6 py-6 md:px-8 md:py-7">
        <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">{section.eyebrow}</p>
        <h3 className="text-2xl font-semibold text-white md:text-[2rem]">{section.title}</h3>
        <p className="max-w-4xl text-base leading-8 text-zinc-300">{section.text}</p>
      </div>
    </article>
  );
}

function RrPanelCta({ product }: { product: Product }) {
  return (
    <article className="mx-auto w-full max-w-5xl rounded-[1.9rem] border border-emerald-400/15 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.14),_rgba(0,0,0,0.95)_58%)] px-6 py-8 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_34px_rgba(74,222,128,0.06)] md:px-10 md:py-10">
      <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">Ready to trade smarter?</p>
      <h3 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Take control of your risk — on every trade you enter</h3>
      <div className="relative z-20 mx-auto mt-6 max-w-md pointer-events-auto">
        <BuyButton productName={product.name} productId={product.slug} priceIdEnv={product.stripePriceEnv} label="Get the RR Panel" helperText="Lifetime updates + ongoing improvements" showCoupon />
        <p className="mt-4 text-sm font-medium text-zinc-200">Used by traders who want full control over risk and execution</p>
        <PaymentTrust />
      </div>
    </article>
  );
}

function RrPanelBundleUpsell() {
  return (
    <article className="mx-auto w-full max-w-5xl rounded-[1.75rem] border border-emerald-400/20 bg-black/40 px-6 py-6 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_30px_rgba(74,222,128,0.08)] md:px-8">
      <h3 className="text-2xl font-semibold text-white md:text-[2rem]">You've got execution — now complete the system</h3>
      <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
        You can plan and manage trades perfectly — but without better entries and discipline, you're still exposed.
      </p>
      <div className="relative z-20 mt-5 pointer-events-auto">
        <Link
          href="/bundle"
          className="inline-flex items-center justify-center rounded-full border border-emerald-300/24 bg-emerald-400/10 px-6 py-3 text-sm font-semibold text-emerald-50 shadow-[0_0_18px_rgba(74,222,128,0.08)] transition hover:-translate-y-0.5 hover:border-emerald-300/40 hover:bg-emerald-400/16 hover:shadow-[0_0_26px_rgba(74,222,128,0.16)]"
        >
          Get the Full Trading System
        </Link>
      </div>
    </article>
  );
}

function SmiScreenshotFrame({ section, productName, priority, onOpen }: { section: ShowcaseSection; productName: string; priority?: boolean; onOpen: (section: ShowcaseSection) => void }) {
  return (
    <article className="w-full overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_34px_rgba(74,222,128,0.05)]">
      <div className="space-y-3 px-6 py-6 md:px-8 md:py-8">
        <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">{section.eyebrow}</p>
        <h3 className="text-2xl font-semibold text-white md:text-[2rem]">{section.title}</h3>
        <p className="max-w-4xl text-base leading-8 text-zinc-300">{section.text}</p>
      </div>
      <button type="button" onClick={() => onOpen(section)} className="group block w-full cursor-pointer text-left" aria-label={`Open larger view for ${section.title}`}>
        <div className="relative border-t border-white/10 bg-black p-3 md:p-4">
          <Image src={section.image} alt={`${productName} ${section.title}`} width={1800} height={1200} className="h-auto w-full object-contain object-center" sizes="(max-width: 1024px) 100vw, 980px" priority={priority} />
          <div className="absolute right-5 top-5 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-100">Click to enlarge</div>
        </div>
      </button>
    </article>
  );
}

function SmiHeroVisualCard({ onOpen }: { onOpen: (section: ShowcaseSection) => void }) {
  const heroSection: ShowcaseSection = {
    eyebrow: "MOMENTUM SHIFT",
    image: "/images/smi inicator  pic/smi-6-clean.jpg",
    title: "Momentum shifts first — price follows after",
    text: "See the shift before the move becomes obvious."
  };

  return <SmiScreenshotFrame section={heroSection} productName="GG SMI Precision" priority onOpen={onOpen} />;
}

function SmiMidCta({ product }: { product: Product }) {
  return (
    <article className="w-full rounded-[1.85rem] border border-emerald-400/15 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.12),_rgba(0,0,0,0.95)_60%)] px-6 py-7 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_28px_rgba(74,222,128,0.06)] md:px-8">
      <h3 className="text-2xl font-semibold text-white md:text-[2rem]">Ready to start entering trades BEFORE the move?</h3>
      <div className="relative z-20 mx-auto mt-5 max-w-md pointer-events-auto">
        <BuyButton productName={product.name} productId={product.slug} priceIdEnv={product.stripePriceEnv} label="Get GG SMI Precision – Instant Access" helperText="Instant download · Lifetime updates · Built for NinjaTrader 8" showCoupon />
      </div>
      <p className="mt-4 text-sm font-medium text-zinc-200">Instant download · Lifetime updates · Built for NinjaTrader 8</p>
      <div className="mx-auto mt-5 max-w-2xl text-left">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200/75">Take it further</p>
        <div className="rounded-[1.5rem] border border-emerald-400/18 bg-black/40 px-5 py-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_0_24px_rgba(74,222,128,0.06)] md:px-6">
          <p className="text-lg font-semibold text-white">Complete your trading system</p>
          <p className="mt-2 text-sm leading-7 text-zinc-300">
            Using SMI for entries? Add <span className="font-medium text-zinc-100">execution and protection</span> for <span className="font-medium text-emerald-100">full control</span>.
          </p>
          <div className="relative z-20 mt-4 pointer-events-auto">
            <Link
              href="/bundle"
              className="inline-flex items-center justify-center rounded-full border border-emerald-300/24 bg-emerald-400/10 px-6 py-3 text-sm font-semibold text-emerald-50 shadow-[0_0_18px_rgba(74,222,128,0.08)] transition hover:-translate-y-0.5 hover:border-emerald-300/40 hover:bg-emerald-400/16 hover:shadow-[0_0_26px_rgba(74,222,128,0.16)]"
            >
              View Full Trading System →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function DailyLockMidCta({ product }: { product: Product }) {
  return (
      <article className="w-full rounded-[1.85rem] border border-emerald-400/15 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.12),_rgba(0,0,0,0.95)_60%)] px-6 py-7 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_28px_rgba(74,222,128,0.06)] md:px-8">
      <h3 className="text-2xl font-semibold text-white md:text-[2rem]">Ready to stop blowing your account in one bad day?</h3>
      <div className="relative z-20 mx-auto mt-5 max-w-md pointer-events-auto">
        <BuyButton productName={product.name} productId={product.slug} priceIdEnv={product.stripePriceEnv} label="Get GG Daily Account Lock – Instant Access" helperText="Instant download · Lifetime updates · Built for NinjaTrader 8" showCoupon />
      </div>
      <p className="mt-4 text-sm font-medium text-zinc-200">Instant download · Lifetime updates · Built for NinjaTrader 8</p>
    </article>
  );
}

function DailyLockBundleUpsell() {
  return (
    <article className="w-full rounded-[1.7rem] border border-emerald-400/20 bg-black/40 px-6 py-6 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_30px_rgba(74,222,128,0.08)] md:px-8">
      <h3 className="text-xl font-semibold text-white md:text-2xl">Protection is only part of the system</h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-zinc-300">
        Locking your account protects you — but without better entries and execution, you're still exposed.
      </p>
      <div className="relative z-20 mt-5 pointer-events-auto">
        <Link
          href="/bundle"
          className="inline-flex items-center justify-center rounded-full border border-emerald-300/24 bg-emerald-400/10 px-6 py-3 text-sm font-semibold text-emerald-50 shadow-[0_0_18px_rgba(74,222,128,0.08)] transition hover:-translate-y-0.5 hover:border-emerald-300/40 hover:bg-emerald-400/16 hover:shadow-[0_0_26px_rgba(74,222,128,0.16)]"
        >
          View Full Trading System
        </Link>
      </div>
    </article>
  );
}

function SmiWorkflowCard() {
  return (
    <article className="rounded-[2rem] border border-white/10 bg-black/35 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_34px_rgba(74,222,128,0.05)] md:p-8">
      <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">WORKFLOW</p>
      <h3 className="mt-3 text-2xl font-semibold text-white md:text-[2rem]">Simple 3-step workflow</h3>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-5"><p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Step 1</p><p className="mt-2 text-lg font-semibold text-white">Identify momentum shift</p></div>
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-5"><p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Step 2</p><p className="mt-2 text-lg font-semibold text-white">Wait for confirmation</p></div>
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-5"><p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Step 3</p><p className="mt-2 text-lg font-semibold text-white">Execute with precision</p></div>
      </div>
      <p className="mt-5 text-sm font-medium text-emerald-200">Works perfectly with GG RR Trade Panel for full execution.</p>
    </article>
  );
}

function DailyWhatYouGetCard() {
  return (
    <article className="rounded-[2rem] border border-white/10 bg-black/35 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_34px_rgba(74,222,128,0.05)] md:p-8">
      <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">WHAT YOU GET</p>
      <h3 className="mt-3 text-2xl font-semibold text-white md:text-[2rem]">Built to stop the spiral before it starts</h3>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-5 text-sm text-zinc-100">Lock trading instantly</div>
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-5 text-sm text-zinc-100">Block new entries</div>
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-5 text-sm text-zinc-100">Flatten all positions</div>
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-5 text-sm text-zinc-100">Prevent overtrading</div>
      </div>
    </article>
  );
}

function DailyWorkflowCard() {
  return (
    <article className="rounded-[2rem] border border-white/10 bg-black/35 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_34px_rgba(74,222,128,0.05)] md:p-8">
      <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">WORKFLOW</p>
      <h3 className="mt-3 text-2xl font-semibold text-white md:text-[2rem]">Simple 3-step workflow</h3>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-5"><p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Step 1</p><p className="mt-2 text-lg font-semibold text-white">Trade your session</p></div>
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-5"><p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Step 2</p><p className="mt-2 text-lg font-semibold text-white">Click “Lock Today”</p></div>
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-5"><p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Step 3</p><p className="mt-2 text-lg font-semibold text-white">Prevent further trades</p></div>
      </div>
    </article>
  );
}

function SmiComparisonCard() {
  return (
    <article className="rounded-[2rem] border border-white/10 bg-black/35 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_34px_rgba(74,222,128,0.05)] md:p-8">
      <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">COMPARISON</p>
      <h3 className="mt-3 text-2xl font-semibold text-white md:text-[2rem]">Not just another SMI</h3>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Standard SMI</p>
          <ul className="mt-4 space-y-3 text-sm text-zinc-300">
            <li className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-zinc-500" /><span>Lagging signals</span></li>
            <li className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-zinc-500" /><span>Hard to read</span></li>
            <li className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-zinc-500" /><span>No context</span></li>
            <li className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-zinc-500" /><span>Late entries</span></li>
          </ul>
        </div>
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/6 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">GG SMI Precision</p>
          <ul className="mt-4 space-y-3 text-sm text-zinc-100">
            <li className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><span>Early momentum shifts</span></li>
            <li className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><span>Clean visual signals</span></li>
            <li className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><span>Clear trading zones</span></li>
            <li className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><span>Precise timing</span></li>
          </ul>
        </div>
      </div>
    </article>
  );
}

function DailyDifferenceCard() {
  return (
    <article className="rounded-[2rem] border border-white/10 bg-black/35 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_34px_rgba(74,222,128,0.05)] md:p-8">
      <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">DISCIPLINE</p>
      <h3 className="mt-3 text-2xl font-semibold text-white md:text-[2rem]">This is not just a tool</h3>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Without it</p>
          <ul className="mt-4 space-y-3 text-sm text-zinc-300">
            <li className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-zinc-500" /><span>Overtrading</span></li>
            <li className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-zinc-500" /><span>Emotional decisions</span></li>
            <li className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-zinc-500" /><span>Giving back profits</span></li>
            <li className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-zinc-500" /><span>Blown accounts</span></li>
          </ul>
        </div>
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/6 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">With GG Daily Account Lock</p>
          <ul className="mt-4 space-y-3 text-sm text-zinc-100">
            <li className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><span>Controlled sessions</span></li>
            <li className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><span>Discipline enforced</span></li>
            <li className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><span>Profits protected</span></li>
            <li className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><span>No revenge trading</span></li>
          </ul>
        </div>
      </div>
    </article>
  );
}

function SmiAudienceCard() {
  return (
    <article className="rounded-[2rem] border border-white/10 bg-black/35 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_34px_rgba(74,222,128,0.05)] md:p-8">
      <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">WHO IT'S FOR</p>
      <h3 className="mt-3 text-2xl font-semibold text-white md:text-[2rem]">Built for serious traders</h3>
      <div className="mt-6 flex flex-wrap gap-3">
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-100">NQ scalpers</span>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-100">Momentum traders</span>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-100">Reversal setups</span>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-100">Intraday precision trading</span>
      </div>
    </article>
  );
}

function DailyAudienceCard() {
  return (
    <article className="rounded-[2rem] border border-white/10 bg-black/35 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_34px_rgba(74,222,128,0.05)] md:p-8">
      <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">IDEAL FOR</p>
      <h3 className="mt-3 text-2xl font-semibold text-white md:text-[2rem]">Built for traders who need discipline enforced</h3>
      <div className="mt-6 flex flex-wrap gap-3">
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-100">Traders who overtrade</span>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-100">Funded account traders</span>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-100">NQ scalpers</span>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-100">Anyone struggling with discipline</span>
      </div>
    </article>
  );
}

function SmiFinalCta({ product }: { product: Product }) {
  return (
    <article className="w-full rounded-[2rem] border border-emerald-400/15 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.14),_rgba(0,0,0,0.95)_58%)] px-6 py-8 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_34px_rgba(74,222,128,0.06)] md:px-10 md:py-10">
      <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">FINAL CTA</p>
      <h3 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Trade momentum shifts with confidence</h3>
      <div className="relative z-20 mx-auto mt-6 max-w-md pointer-events-auto">
        <BuyButton productName={product.name} productId={product.slug} priceIdEnv={product.stripePriceEnv} label="Get GG SMI Precision Now" helperText="Instant access for NinjaTrader 8" showCoupon />
        <PaymentTrust />
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-zinc-100">
        <span className="rounded-full border border-white/10 bg-black/40 px-4 py-2">Instant download</span>
        <span className="rounded-full border border-white/10 bg-black/40 px-4 py-2">Lifetime updates</span>
        <span className="rounded-full border border-white/10 bg-black/40 px-4 py-2">Built for NinjaTrader 8</span>
      </div>
      <p className="mt-5 text-sm font-medium text-emerald-200">Most traders combine this with GG RR Trade Panel.</p>
    </article>
  );
}

function DailyFinalCta({ product }: { product: Product }) {
  return (
    <article className="w-full rounded-[2rem] border border-emerald-400/15 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.14),_rgba(0,0,0,0.95)_58%)] px-6 py-8 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_34px_rgba(74,222,128,0.06)] md:px-10 md:py-10">
      <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">FINAL CTA</p>
      <h3 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Protect your profits. Lock your day.</h3>
      <div className="relative z-20 mx-auto mt-6 max-w-md pointer-events-auto">
        <BuyButton productName={product.name} productId={product.slug} priceIdEnv={product.stripePriceEnv} label="Get GG Daily Account Lock – Instant Access" helperText="Instant access for NinjaTrader 8" showCoupon />
        <PaymentTrust />
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-zinc-100">
        <span className="rounded-full border border-white/10 bg-black/40 px-4 py-2">Instant download</span>
        <span className="rounded-full border border-white/10 bg-black/40 px-4 py-2">Lifetime updates</span>
        <span className="rounded-full border border-white/10 bg-black/40 px-4 py-2">Works across accounts</span>
      </div>
    </article>
  );
}

function SmiPrecisionShowcase({ product, onOpen }: { product: Product; onOpen: (section: ShowcaseSection) => void }) {
  return (
    <section className="space-y-8 rounded-[2rem] border border-white/10 bg-zinc-950/70 px-5 pb-5 pt-2 md:px-8 md:pb-8 md:pt-3 xl:px-10 xl:pb-10 xl:pt-3">
      <SmiHeroVisualCard onOpen={onOpen} />
      <div className="space-y-8">
        {smiSections.map((section, index) => (
          <div key={section.title} className="space-y-8">
            <SmiScreenshotFrame section={section} productName={product.name} priority={index === 0} onOpen={onOpen} />
            {index === 2 ? (
              <p className="px-2 text-sm leading-7 text-zinc-400 md:px-1">
                Use GG SMI Precision for timing — and GG RR Trade Panel for execution.
              </p>
            ) : null}
            {index === 2 ? <SmiMidCta product={product} /> : null}
          </div>
        ))}
      </div>
      <SmiWorkflowCard />
      <SmiComparisonCard />
      <SmiAudienceCard />
      <SmiFinalCta product={product} />
    </section>
  );
}

function DailyAccountLockShowcase({ product, onOpen }: { product: Product; onOpen: (section: ShowcaseSection) => void }) {
  return (
    <section className="space-y-8 rounded-[2rem] border border-white/10 bg-zinc-950/70 px-5 pb-5 pt-2 md:px-8 md:pb-8 md:pt-3 xl:px-10 xl:pb-10 xl:pt-3">
      <div className="space-y-8">
        {dailyAccountLockSections.map((section, index) => (
          <div key={section.title} className="space-y-8">
            <SmiScreenshotFrame section={section} productName={product.name} priority={index === 0} onOpen={onOpen} />
            {index === 1 ? <DailyLockMidCta product={product} /> : null}
            {index === 1 ? <DailyLockBundleUpsell /> : null}
          </div>
        ))}
      </div>
      <DailyWhatYouGetCard />
      <DailyWorkflowCard />
      <DailyDifferenceCard />
      <DailyAudienceCard />
      <DailyFinalCta product={product} />
    </section>
  );
}

export function ProductMediaShowcase({ product }: { product: Product }) {
  const [activeSection, setActiveSection] = useState<ShowcaseSection | null>(null);

  if (product.slug === "gg-rr-trade-panel") {
    return (
      <>
        <section className="space-y-8 rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6 md:p-8">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">RR Panel workflow</p>
            <h2 className="text-3xl font-semibold text-white md:text-4xl">See exactly how every trade is planned, managed, and executed</h2>
            <p className="text-base leading-8 text-zinc-400 md:text-lg">Click any image to zoom in and see how the RR Panel helps you plan, adjust, and manage trades directly on the chart.</p>
          </div>
          <div className="space-y-3">
            <p className="text-center text-sm font-medium text-zinc-200">This is how professional traders manage risk - visually and in real time</p>
          </div>
          <div className="space-y-8">
            {rrPanelSections.map((section, index) => (
              <div key={section.title} className="space-y-8">
                <RrPanelSectionCard productName={product.name} section={section} priority={index === 0} onOpen={setActiveSection} />
                {index === 2 ? <RrPanelBundleUpsell /> : null}
              </div>
            ))}
          </div>
          <RrPanelCta product={product} />
        </section>
        {activeSection ? <ProductLightbox image={activeSection.image} title={activeSection.title} onClose={() => setActiveSection(null)} /> : null}
      </>
    );
  }

  if (product.slug === "gg-stochastic-momentum-index") {
    return (
      <>
        <SmiPrecisionShowcase product={product} onOpen={setActiveSection} />
        {activeSection ? <ProductLightbox image={activeSection.image} title={activeSection.title} onClose={() => setActiveSection(null)} /> : null}
      </>
    );
  }

  if (product.slug === "daily-account-lock-addon") {
    return (
      <>
        <DailyAccountLockShowcase product={product} onOpen={setActiveSection} />
        {activeSection ? <ProductLightbox image={activeSection.image} title={activeSection.title} onClose={() => setActiveSection(null)} /> : null}
      </>
    );
  }

  return (
    <section className="space-y-6 rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">Screenshots & Demo</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">See how {product.name} looks inside NinjaTrader 8</h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-zinc-400">Clean media framing keeps the focus on what the tool does on the chart and why it helps traders execute with more confidence.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="overflow-hidden rounded-[1.75rem] border border-emerald-400/20 bg-black/40 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_40px_rgba(74,222,128,0.08)]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Main screenshot</p>
              <p className="mt-1 text-lg font-semibold text-white">Primary workflow preview</p>
            </div>
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">Live chart layout</span>
          </div>
          <div className="bg-black px-4 py-4">
            <Image src={product.media.mainImage} alt={`${product.name} main screenshot`} width={1800} height={1200} className="h-auto w-full object-contain object-center" sizes="(max-width: 1280px) 100vw, 60vw" priority />
          </div>
          <div className="space-y-2 border-t border-white/10 px-5 py-4">
            <p className="text-sm font-semibold text-white">Real NinjaTrader 8 chart using this tool</p>
            <p className="text-sm leading-7 text-zinc-300">{product.media.mainCaption}</p>
          </div>
        </article>
        <aside className="rounded-[1.75rem] border border-white/10 bg-black/35 p-5 shadow-[0_0_28px_rgba(74,222,128,0.05)]">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">What you're seeing</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Simple chart context that helps you act faster</h3>
          <p className="mt-3 text-sm leading-7 text-zinc-400">This view shows how the tool fits directly into a real NinjaTrader workflow so decisions stay clear, fast, and structured.</p>
          <div className="mt-5 space-y-3">
            {product.media.whatYoureSeeing.map((point) => (
              <div key={point} className="rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-4 text-sm leading-7 text-zinc-300">{point}</div>
            ))}
          </div>
          <div className="mt-5">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Key use cases</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.quickBullets.map((bullet) => (
                <span key={bullet} className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200">{bullet}</span>
              ))}
            </div>
          </div>
        </aside>
      </div>
      <div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Supporting screenshots</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Three focused chart views for different trade scenarios</h3>
          </div>
          <p className="max-w-lg text-sm leading-7 text-zinc-400">Each card can be replaced later with a real chart capture that highlights a specific use case.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {product.media.gallery.map((item) => (
            <article key={item.title} className="overflow-hidden rounded-[1.5rem] border border-emerald-400/15 bg-black/35 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_0_24px_rgba(74,222,128,0.05)]">
              <div className="bg-black px-4 py-4">
                <Image src={item.image} alt={`${product.name} ${item.title} screenshot`} width={1200} height={900} className="h-auto w-full object-contain object-center" sizes="(max-width: 768px) 100vw, 33vw" />
              </div>
              <div className="space-y-2 border-t border-white/10 px-4 py-4">
                <h3 className="text-base font-semibold text-white">{item.title}</h3>
                <p className="text-sm leading-6 text-zinc-300">{item.caption}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
      <article className="overflow-hidden rounded-[1.75rem] border border-emerald-400/15 bg-black/40 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_0_32px_rgba(74,222,128,0.06)]">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Video demo</p>
          <p className="mt-1 text-lg font-semibold text-white">Watch it in action</p>
        </div>
        <div className="relative aspect-[16/9] overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(52,211,153,0.16),_rgba(0,0,0,0.96)_58%)]">
          <video className="h-full w-full object-cover" controls preload="metadata" playsInline>
            <source src={product.media.videoPath} type="video/mp4" />
          </video>
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 border-t border-white/10 bg-black/55 px-5 py-4 text-sm md:flex-row md:items-center md:justify-between">
            <span className="font-medium text-zinc-200">Responsive video slot ready for your real NinjaTrader demo</span>
            <span className="font-mono text-xs text-zinc-400">{product.media.videoPath}</span>
          </div>
        </div>
        <p className="border-t border-white/10 px-5 py-4 text-sm leading-7 text-zinc-300">{product.media.videoCaption}</p>
      </article>
    </section>
  );
}
