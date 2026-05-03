export type Product = {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  benefitLine: string;
  price: number;
  twoDevicePrice: number;
  category: string;
  stripePriceEnv: string;
  badge?: string;
  features: string[];
  quickBullets: string[];
  idealFor: string[];
  media: {
    mainImage: string;
    mainCaption: string;
    whatYoureSeeing: string[];
    gallery: {
      title: string;
      caption: string;
      image: string;
    }[];
    videoPath: string;
    videoCaption: string;
  };
};

export type BundleViewer = {
  slug: string;
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  benefitLine: string;
  price: number;
  marketingValue: string;
  savings: number;
  savingsLabel: string;
  category: string;
  badge?: string;
  stripePriceEnv: string;
  includedSlugs: string[];
  highlights: string[];
};

export type DevicePricingOption = {
  deviceCount: 1 | 2;
  price: number;
  label: string;
  badge?: string;
};

export function getProductDeviceSavings(product: Product) {
  return Math.max(0, product.price * 2 - product.twoDevicePrice);
}

export const bundleDeviceUpgrade = {
  id: "good-gains-trading-toolkit-2-device-upgrade",
  name: "Good Gains Trading Toolkit 2-Device Upgrade",
  price: 149
} as const;

export const products: Product[] = [
  {
    slug: "gg-rr-trade-panel",
    name: "GG RR Trade Panel",
    shortDescription: "Advanced risk-reward trade panel for NinjaTrader 8.",
    description:
      "Plan, manage, and adjust trades directly from the chart with a precision-focused risk-reward panel made for active futures execution.",
    benefitLine: "Control your risk visually and execute trades faster.",
    price: 299,
    twoDevicePrice: 529,
    category: "Trade Management",
    stripePriceEnv: "STRIPE_PRICE_GG_RR_TRADE_PANEL",
    badge: "Most Popular",
    features: [
      "Long and short trade planning",
      "Visual TP/SL zones",
      "Market and limit entry support",
      "Live sync between chart orders and RR box",
      "Average entry adjustment when scaling in",
      "Partial close support",
      "Live PnL in points and dollars",
      "Fast on-chart TP/SL adjustment"
    ],
    quickBullets: ["Visual risk-reward planning", "On-chart TP/SL control", "Live sync with chart orders"],
    idealFor: ["Intraday futures traders", "Fast execution workflows", "Risk-first discretionary trading"],
    media: {
      mainImage: "/images/gg-rr-trade-panel-main.png",
      mainCaption: "Preview the on-chart GG RR Trade Panel workflow with structured entries, visual TP/SL zones, and quick trade management controls.",
      whatYoureSeeing: [
        "The chart shows a structured entry with the full risk-reward box already mapped before the trade is placed.",
        "Take-profit and stop-loss zones stay visual so you can adjust quickly without losing context.",
        "The workflow is built to help active traders react faster while keeping risk clear on screen."
      ],
      gallery: [
        {
          title: "Trade planning view",
          caption: "Structured entry, target, and stop mapped directly on the chart.",
          image: "/images/gg-rr-trade-panel-1.png"
        },
        {
          title: "Scaling and adjustment",
          caption: "Average entry and TP/SL adjustments stay visible during scale-ins.",
          image: "/images/gg-rr-trade-panel-2.png"
        },
        {
          title: "Live execution state",
          caption: "Open orders, partial closes, and live PnL remain easy to manage.",
          image: "/images/gg-rr-trade-panel-3.png"
        }
      ],
      videoPath: "/videos/gg-rr-trade-panel.mp4",
      videoCaption: "Place your walkthrough or trade-management demo here to show how the panel behaves during real chart interaction."
    }
  },
  {
    slug: "daily-account-lock-addon",
    name: "GG Daily Account Lock AddOn",
    shortDescription: "Discipline lock tool for NinjaTrader 8.",
    description:
      "Stop revenge trading, block new entries, and protect your day with a lockout tool built for futures discipline.",
    benefitLine: "Lock your session before emotions take over.",
    price: 149,
    twoDevicePrice: 249,
    category: "Risk Control",
    stripePriceEnv: "STRIPE_PRICE_DAILY_ACCOUNT_LOCK",
    features: [
      "Lock trading instantly",
      "Block new entries",
      "Flatten all positions",
      "Prevent overtrading",
      "Persistent lock after restart",
      "Daily reset time support"
    ],
    quickBullets: ["Block new entries", "Prevent revenge trading", "Protect profits after your session"],
    idealFor: ["Traders who overtrade", "Funded account traders", "NQ scalpers", "Anyone struggling with discipline"],
    media: {
      mainImage: "/images/daily-account-lock-addon-main.png",
      mainCaption: "Feature the lock workflow, account selector, and one-click safety controls that stop new entries after the day is done.",
      whatYoureSeeing: [
        "The interface highlights the account lock controls that let you stop trading for the day in one click.",
        "This view is designed to cancel orders, flatten positions, and protect discipline when limits are reached.",
        "It gives traders a simple safety layer that reduces emotional re-entry and overtrading."
      ],
      gallery: [
        {
          title: "Lock control panel",
          caption: "Account lock controls stay simple and clear when discipline matters.",
          image: "/images/daily-account-lock-addon-1.png"
        },
        {
          title: "Flatten all workflow",
          caption: "Orders cancel and positions flatten quickly from one safety action.",
          image: "/images/daily-account-lock-addon-2.png"
        },
        {
          title: "Persistent safety state",
          caption: "Locked status and daily reset timing remain visible after restart.",
          image: "/images/daily-account-lock-addon-3.png"
        }
      ],
      videoPath: "/videos/daily-account-lock-addon.mp4",
      videoCaption: "Add a short video that demonstrates locking the account, blocking new entries, and carrying the lock across restart."
    }
  },
  {
    slug: "session-high-low-indicator",
    name: "GG Session High/Low Indicator",
    shortDescription: "Session reference indicator for NinjaTrader 8.",
    description:
      "Automatically plot key session levels so you can spot liquidity, reactions, and structure in real time.",
    benefitLine: "See where price is likely to react — before it happens",
    price: 79,
    twoDevicePrice: 119,
    category: "Session Tools",
    stripePriceEnv: "STRIPE_PRICE_SESSION_HIGH_LOW",
    features: [
      "Asia session highs and lows mapped automatically",
      "London session levels tracked in real time",
      "New York session highs and lows plotted automatically",
      "Clean labels and lightweight chart display"
    ],
    quickBullets: ["Auto-marked Asia, London & New York session levels", "Clear session structure directly on chart", "Understand where liquidity is building"],
    idealFor: ["Session-based strategy traders", "Breakout and sweep setups", "Clean chart layouts", "Built for traders who rely on session structure and liquidity reactions."],
    media: {
      mainImage: "/images/session-high-low-indicator-main.png",
      mainCaption: "Use this section to show session high and low levels mapped cleanly across the chart with minimal visual clutter.",
      whatYoureSeeing: [
        "The chart highlights the Asia, London, and New York ranges so key reaction levels stand out immediately.",
        "Labels stay clean and readable, helping traders frame structure without overloading the screen.",
        "This makes it easier to spot sweeps, breakouts, and session-based setups before momentum expands."
      ],
      gallery: [
        {
          title: "Asia session levels",
          caption: "Asia highs and lows stand out without cluttering the chart.",
          image: "/images/session-high-low-indicator-1.png"
        },
        {
          title: "London session levels",
          caption: "London levels stay readable alongside your normal execution view.",
          image: "/images/session-high-low-indicator-2.png"
        },
        {
          title: "New York session levels",
          caption: "New York session structure helps frame reactions and breakouts fast.",
          image: "/images/session-high-low-indicator-3.png"
        }
      ],
      videoPath: "/videos/session-high-low-indicator.mp4",
      videoCaption: "This placeholder is ready for a session-mapping walkthrough that explains how traders can read global range structure quickly."
    }
  },
  {
    slug: "gg-stochastic-momentum-index",
    name: "GG SMI Precision",
    shortDescription: "Momentum indicator for NinjaTrader 8.",
    description:
      "Read momentum pressure and timing shifts with a cleaner SMI workflow built for intraday futures charts and confirmation-based execution.",
    benefitLine: "Time your entries with clean momentum signals.",
    price: 119,
    twoDevicePrice: 199,
    category: "Momentum Indicators",
    stripePriceEnv: "STRIPE_PRICE_GG_SMI",
    features: [
      "Stochastic Momentum Index calculation",
      "Momentum signal reading",
      "Overbought and oversold conditions",
      "Trend continuation and reversal confirmation",
      "Clean intraday timing signals"
    ],
    quickBullets: ["Momentum signal confirmation", "Overbought and oversold context", "Cleaner trend timing cues"],
    idealFor: ["Momentum confirmation", "Intraday timing", "Trend continuation setups"],
    media: {
      mainImage: "/images/gg-stochastic-momentum-index-main.png",
      mainCaption: "Highlight the SMI panel, signal shifts, and momentum context that help traders time intraday entries with more confidence.",
      whatYoureSeeing: [
        "The momentum panel shows directional pressure and timing shifts that support cleaner trade confirmation.",
        "Overbought and oversold zones help traders read when a move may be stretching or ready to reverse.",
        "This view is meant to improve timing, not clutter the chart, so decisions stay fast and focused."
      ],
      gallery: [
        {
          title: "Momentum confirmation",
          caption: "Momentum pressure and direction are easier to read at a glance.",
          image: "/images/gg-stochastic-momentum-index-1.png"
        },
        {
          title: "Overbought and oversold",
          caption: "Overbought and oversold conditions become cleaner and easier to time.",
          image: "/images/gg-stochastic-momentum-index-2.png"
        },
        {
          title: "Intraday entry timing",
          caption: "Intraday timing signals help confirm entries with less noise.",
          image: "/images/gg-stochastic-momentum-index-3.png"
        }
      ],
      videoPath: "/videos/gg-stochastic-momentum-index.mp4",
      videoCaption: "Drop in a future demo that walks through clean momentum timing, confirmation logic, and example intraday trade setups."
    }
  }
];

export const bundle = {
  id: "good-gains-trading-toolkit",
  slug: "good-gains-trading-toolkit",
  name: "Good Gains Trading Toolkit",
  shortDescription: "Four premium NinjaTrader 8 tools in one bundle.",
  description:
    "Get the full Good Gains execution stack in one place, with the core tools built to work together for cleaner entries, stronger risk control, and a more structured trading workflow.",
  benefitLine: "4 tools. One bundle. Full trading system.",
  price: 399,
  savings: 247,
  marketingValue: "$646 Value",
  savingsLabel: "Save over 30%",
  category: "Toolkit Bundle",
  badge: "Best Value",
  stripePriceEnv: "STRIPE_PRICE_BUNDLE",
  includedSlugs: products.map((product) => product.slug),
  highlights: [
    "GG RR Trade Panel ($299)",
    "GG Daily Account Lock AddOn ($149)",
    "GG Session High/Low Indicator ($79)",
    "GG SMI Precision ($119)"
  ]
} as const satisfies BundleViewer;

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function isBundleSlug(slug: string) {
  return slug === bundle.slug || slug === bundle.id;
}

export function getProductPrice(
  product: Product | BundleViewer,
  deviceCount: 1 | 2 = 1
) {
  if ("twoDevicePrice" in product) {
    return deviceCount === 2 ? product.twoDevicePrice : product.price;
  }

  return product.price;
}

export function getProductDeviceOptions(product: Product): DevicePricingOption[] {
  return [
    {
      deviceCount: 1,
      price: product.price,
      label: "1 Device"
    },
    {
      deviceCount: 2,
      price: product.twoDevicePrice,
      label: "2 Devices",
      badge: "Best Value"
    }
  ];
}

export function normalizeDeviceCount(value?: number | string | null): 1 | 2 {
  return Number(value) === 2 ? 2 : 1;
}

