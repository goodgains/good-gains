function resolveConfiguredEmail(...values: Array<string | undefined>) {
  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized) continue;
    if (!normalized.includes("@")) continue;
    return normalized;
  }

  return "support@goodgainsindicators.com";
}

const supportEmail = resolveConfiguredEmail(
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  process.env.SUPPORT_EMAIL
);

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
