const supportEmail = process.env.SUPPORT_EMAIL?.trim() || "support@goodgainsindicators.com";
const emailFromName = process.env.EMAIL_FROM_NAME?.trim() || "Good Gains Support";

export const siteConfig = {
  name: "Good Gains Indicators",
  shortName: "Good Gains",
  description:
    "Premium NinjaTrader 8 indicators and trading tools built for serious futures traders.",
  supportEmail,
  contactEmail: supportEmail,
  emailFromName,
  disclaimer:
    "Trading futures involves substantial risk and is not suitable for every investor. Good Gains Indicators provides software tools only and does not provide financial advice, trading signals, or guaranteed results."
} as const;
