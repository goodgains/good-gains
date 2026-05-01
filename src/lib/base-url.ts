const DEFAULT_PRODUCTION_BASE_URL = "https://goodgainsindicators.com";

function normalizeBaseUrl(value?: string | null) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized.replace(/\/+$/, "");
}

function isLocalBaseUrl(value: string) {
  try {
    const { hostname } = new URL(value);

    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname === "[::1]"
    );
  } catch {
    return false;
  }
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

  const candidates = [
    normalizeBaseUrl(process.env.BASE_URL),
    normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL),
    normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL),
    normalizeBaseUrl(process.env.SITE_URL),
    vercelProductionUrl,
    vercelUrl,
  ].filter((value): value is string => Boolean(value));

  const publicBaseUrl = candidates.find((value) => !isLocalBaseUrl(value));

  return publicBaseUrl || DEFAULT_PRODUCTION_BASE_URL;
}
