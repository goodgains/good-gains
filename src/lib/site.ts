const supportEmail = process.env.SUPPORT_EMAIL?.trim() || "goodgainsindicators@gmail.com";

export const siteConfig = {
  name: "Good Gains Indicators",
  shortName: "Good Gains",
  description:
    "Premium NinjaTrader 8 indicators and trading tools built for serious futures traders.",
  supportEmail,
  contactEmail: "hello@goodgainsindicators.com",
  disclaimer:
    "Trading futures involves substantial risk and is not suitable for every investor. Good Gains Indicators provides software tools only and does not provide financial advice, trading signals, or guaranteed results."
} as const;
