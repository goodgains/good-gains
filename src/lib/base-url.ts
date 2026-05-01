const DEFAULT_PRODUCTION_BASE_URL = "https://goodgainsindicators.com";

function normalizeBaseUrl(value?: string | null) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized.replace(/\/+$/, "");
}

export function getBaseUrl() {
  const vercelProductionUrl = normalizeBaseUrl(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null
  );
  const vercelUrl = normalizeBaseUrl(
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
  );

  return (
    normalizeBaseUrl(process.env.BASE_URL) ||
    normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL) ||
    normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeBaseUrl(process.env.SITE_URL) ||
    vercelProductionUrl ||
    vercelUrl ||
    DEFAULT_PRODUCTION_BASE_URL
  );
}
