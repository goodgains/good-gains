import type { Metadata } from "next";

export const CANONICAL_SITE_URL = "https://goodgainsindicators.com";

function createMetadata(title: string, description: string, path = "/"): Metadata {
  const canonicalPath = path.startsWith("/") ? path : `/${path}`;
  const canonicalUrl = `${CANONICAL_SITE_URL}${canonicalPath === "/" ? "" : canonicalPath}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl
    },
    openGraph: {
      type: "website",
      siteName: "Good Gains Indicators",
      title,
      description,
      url: canonicalUrl
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true
      }
    }
  };
}

export const pageMetadata = {
  home: createMetadata(
    "NinjaTrader 8 Indicators & Trading Tools | Good Gains",
    "Professional NinjaTrader 8 indicators and trading tools for NQ futures traders. Improve execution, manage risk, and trade smarter with advanced chart tools.",
    "/"
  ),
  bundle: createMetadata(
    "NinjaTrader 8 Indicator Bundle | Full Trading System",
    "Complete NinjaTrader 8 trading system bundle with risk reward tools, session levels, account protection, and momentum indicators for futures traders.",
    "/bundle"
  ),
  customDevelopment: createMetadata(
    "Custom NinjaTrader 8 Development | Indicators & Strategies",
    "Custom NinjaTrader 8 indicator and strategy development for futures traders who need trading tools tailored to their workflow.",
    "/custom-development"
  ),
  licenseActivation: createMetadata(
    "NinjaTrader 8 License Activation & Downloads | Good Gains",
    "Activate your NinjaTrader 8 license, download your trading tools, and manage Good Gains Indicators access in one place.",
    "/license-activation"
  ),
  recoverLicense: createMetadata(
    "Recover NinjaTrader 8 License | Good Gains Indicators",
    "Recover your NinjaTrader 8 license key and download access instantly using your email.",
    "/recover-license"
  ),
  contact: createMetadata(
    "NinjaTrader 8 Support & Contact | Good Gains Indicators",
    "Contact Good Gains support for NinjaTrader 8 indicators, risk reward tools, installation help, license activation, and product questions.",
    "/contact"
  ),
  support: createMetadata(
    "NinjaTrader 8 Indicator Support | Good Gains Indicators",
    "Get support for Good Gains NinjaTrader 8 indicators, NQ futures trading tools, installation, license activation, and downloads.",
    "/support"
  ),
  products: createMetadata(
    "NinjaTrader 8 Products | Good Gains Indicators",
    "Explore Good Gains NinjaTrader 8 indicators and trading tools for risk control, NQ futures execution, session levels, and momentum analysis.",
    "/products"
  ),
  pricing: createMetadata(
    "NinjaTrader 8 Pricing | Good Gains Indicators",
    "Compare NinjaTrader 8 indicator pricing, risk reward tool options, bundle savings, and instant access for Good Gains trading tools.",
    "/pricing"
  ),
  faq: createMetadata(
    "NinjaTrader 8 FAQ | Good Gains Indicators",
    "Answers to common questions about Good Gains NinjaTrader 8 indicators, trading tools, installation, license activation, downloads, and support.",
    "/faq"
  ),
  downloads: createMetadata(
    "NinjaTrader 8 Downloads | Good Gains Indicators",
    "Access Good Gains NinjaTrader 8 product downloads, license-protected files, and installation resources for trading tools.",
    "/downloads"
  ),
  downloadAccess: createMetadata(
    "NinjaTrader 8 Download Access Portal | Good Gains Indicators",
    "Use your Good Gains download access for NinjaTrader 8 indicators and futures trading tools.",
    "/downloads/access"
  ),
  secureDownloads: createMetadata(
    "NinjaTrader 8 Secure Downloads | Good Gains Indicators",
    "Download your purchased Good Gains NinjaTrader 8 tools securely with your private license access.",
    "/downloads"
  ),
  success: createMetadata(
    "NinjaTrader 8 Download Access | Good Gains Indicators",
    "Access your Good Gains NinjaTrader 8 license key, product downloads, and setup details after checkout.",
    "/success"
  ),
  cancel: createMetadata(
    "NinjaTrader 8 Checkout Canceled | Good Gains Indicators",
    "Return to Good Gains NinjaTrader 8 tools after a canceled checkout or choose another product.",
    "/cancel"
  ),
  paddleCheckout: createMetadata(
    "NinjaTrader 8 Secure Checkout | Good Gains Indicators",
    "Complete secure checkout for Good Gains NinjaTrader 8 indicators and receive instant license delivery.",
    "/checkout/paddle"
  ),
  resetLicense: createMetadata(
    "Reset NinjaTrader 8 License Device | Good Gains Indicators",
    "Reset your Good Gains NinjaTrader 8 license device lock and recover access after changing computers.",
    "/reset-license"
  ),
  terms: createMetadata(
    "NinjaTrader 8 Terms of Service | Good Gains Indicators",
    "Review the Good Gains Indicators terms for NinjaTrader 8 digital software licenses, usage rules, delivery, and customer responsibilities.",
    "/terms"
  ),
  privacy: createMetadata(
    "NinjaTrader 8 Privacy Policy | Good Gains Indicators",
    "Learn how Good Gains Indicators handles customer data for NinjaTrader 8 license delivery, verification, recovery, and support.",
    "/privacy-policy"
  ),
  refund: createMetadata(
    "NinjaTrader 8 Refund Policy | Good Gains Indicators",
    "Review the refund policy for Good Gains NinjaTrader 8 digital software tools, license delivery, and technical support.",
    "/refund-policy"
  ),
  riskDisclaimer: createMetadata(
    "NinjaTrader 8 Risk Disclaimer | Good Gains Indicators",
    "Read the trading risk disclaimer for Good Gains NinjaTrader 8 tools and understand the risks of futures, NQ futures, and active trading.",
    "/risk-disclaimer"
  )
} satisfies Record<string, Metadata>;

export const productPageMetadata: Record<string, Metadata> = {
  "gg-rr-trade-panel": createMetadata(
    "NinjaTrader 8 Risk Reward Trade Panel | GG RR Tool",
    "Advanced NinjaTrader 8 risk reward panel for NQ futures. Plan entries, stop loss, and take profit directly on chart with real-time execution.",
    "/products/gg-rr-trade-panel"
  ),
  "gg-daily-account-lock": createMetadata(
    "NinjaTrader 8 Daily Account Lock AddOn | Risk Control Tool",
    "Protect your account with a NinjaTrader 8 daily lock tool. Stop revenge trading and block new entries after reaching your daily limit.",
    "/products/gg-daily-account-lock"
  ),
  "gg-session-high-low": createMetadata(
    "NinjaTrader 8 Session High Low Indicator | Asia London New York Levels",
    "Track Asia, London, and New York session levels in NinjaTrader 8. Identify liquidity zones and key NQ futures reactions before price moves.",
    "/products/gg-session-high-low"
  ),
  "gg-stochastic-momentum-index": createMetadata(
    "NinjaTrader 8 SMI Indicator | Momentum & Entry Timing Tool",
    "High-precision Stochastic Momentum Index indicator for NinjaTrader 8. Spot momentum shifts, overbought and oversold conditions, and time entries better.",
    "/products/gg-stochastic-momentum-index"
  ),
  "good-gains-trading-toolkit": pageMetadata.bundle
};
