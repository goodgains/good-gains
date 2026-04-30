import { bundle, products } from "@/lib/products";

export type DownloadRelease = {
  slug: string;
  name: string;
  version: string;
  fileName: string;
  filePath: string;
  updatedAt: string;
  installNotes: string[];
  changelog: string[];
};

export const productDownloads: DownloadRelease[] = [
  {
    slug: "gg-rr-trade-panel",
    name: "GG RR Trade Panel",
    version: "v1.4.2",
    fileName: "GG-RR-Trade-Panel-v1.4.2.zip",
    filePath: "/downloads/GG-RR-Trade-Panel-v1.4.2.zip",
    updatedAt: "April 26, 2026",
    installNotes: [
      "Import the ZIP into NinjaTrader 8 using Tools > Import > NinjaScript Add-On.",
      "Open a chart and add the indicator or panel from your NinjaTrader indicator list.",
      "Use your license key during activation when the live license flow is enabled."
    ],
    changelog: [
      "Improved chart sync stability between manual order changes and RR box updates.",
      "Refined partial close handling for faster trade management during active sessions.",
      "Minor UI cleanup for clearer TP/SL adjustments on chart."
    ]
  },
  {
    slug: "daily-account-lock-addon",
    name: "GG Daily Account Lock AddOn",
    version: "v1.0",
    fileName: "GG-Daily-Account-Lock-AddOn-v1.0.zip",
    filePath: "/downloads/GG-Daily-Account-Lock-AddOn-v1.0.zip",
    updatedAt: "April 30, 2026",
    installNotes: [
      "Import the ZIP into NinjaTrader 8 using Tools > Import > NinjaScript Add-On.",
      "Open the add-on from the NinjaTrader control center after import completes.",
      "Enter your license key when the activation prompt appears."
    ],
    changelog: [
      "Added protected license validation before lock and flatten actions run.",
      "Included the latest account control and locked-status workflow updates.",
      "Prepared the production ZIP for private delivery and re-download access."
    ]
  },
  {
    slug: "session-high-low-indicator",
    name: "GG Session High/Low Indicator",
    version: "v1.0",
    fileName: "GG-Session-High-Low-Indicator-v1.0.zip",
    filePath: "/downloads/GG-Session-High-Low-Indicator-v1.0.zip",
    updatedAt: "April 30, 2026",
    installNotes: [
      "Import the ZIP into NinjaTrader 8 using Tools > Import > NinjaScript Add-On.",
      "Add the indicator to your chart and configure the session display settings.",
      "Enter your license key when the activation prompt appears."
    ],
    changelog: [
      "Added protected license validation before session levels render.",
      "Included the latest session range and market structure display updates.",
      "Prepared the production ZIP for private delivery and re-download access."
    ]
  },
  {
    slug: "gg-stochastic-momentum-index",
    name: "GG SMI Precision",
    version: "v1.0.0",
    fileName: "GG-SMI-Precision-v1.0.0.zip",
    filePath: "/downloads/GG-SMI-Precision-v1.0.0.zip",
    updatedAt: "April 26, 2026",
    installNotes: [
      "Import the ZIP into NinjaTrader 8 using Tools > Import > NinjaScript Add-On.",
      "Attach the indicator to your chart and tune the timing settings to your workflow.",
      "Enter your license key when the activation prompt is available in production."
    ],
    changelog: [
      "Improved intraday timing responsiveness in fast momentum shifts.",
      "Refined overbought and oversold signal readability.",
      "General performance tuning for smoother chart updates."
    ]
  }
];

export const bundleDownload: DownloadRelease = {
  slug: "bundle",
  name: bundle.name,
  version: "v2026.04",
  fileName: "Good-Gains-Trading-Toolkit-v2026.04.zip",
  filePath: "/downloads/Good-Gains-Trading-Toolkit-v2026.04.zip",
  updatedAt: "April 26, 2026",
  installNotes: [
    "Import each included ZIP into NinjaTrader 8 using Tools > Import > NinjaScript Add-On.",
    "Open the tools you purchased and keep the issued license key for activation.",
    "Use the same private download page any time you need the latest version again."
  ],
  changelog: [
    "Packaged the latest versions of all four Good Gains tools into one delivery bundle.",
    "Updated included files to match the newest individual releases listed on this page.",
    "Prepared the bundle package for ongoing re-download access as future updates ship."
  ]
};

export function getDownloadByProductName(productName?: string | null) {
  if (!productName) return null;

  const normalized = productName.trim().toLowerCase();

  if (normalized === bundle.name.toLowerCase()) {
    return bundleDownload;
  }

  return productDownloads.find((download) => download.name.toLowerCase() === normalized) ?? null;
}

export function getDownloadProducts() {
  return products.map((product) => {
    const release = productDownloads.find((item) => item.slug === product.slug);

    return {
      ...product,
      release
    };
  });
}

export function getReleaseBySlug(slug: string) {
  if (slug === "bundle") {
    return bundleDownload;
  }

  return productDownloads.find((download) => download.slug === slug) ?? null;
}

