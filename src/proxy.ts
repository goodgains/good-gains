import { NextResponse, type NextRequest } from "next/server";

const CANONICAL_HOST = "goodgainsindicators.com";
const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;

const canonicalPathRedirects: Record<string, string> = {
  "/terms-of-service": "/terms",
  "/products/daily-account-lock-addon": "/products/gg-daily-account-lock",
  "/products/session-high-low-indicator": "/products/gg-session-high-low"
};

function permanentRedirect(url: URL) {
  return NextResponse.redirect(url, 301);
}

export function proxy(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const host = request.headers.get("host")?.toLowerCase().split(":")[0];
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isCanonicalDomain = host === CANONICAL_HOST || host === `www.${CANONICAL_HOST}`;
  const needsCanonicalHost = host === `www.${CANONICAL_HOST}`;
  const needsHttps = isCanonicalDomain && forwardedProto === "http";
  const canonicalPath = canonicalPathRedirects[requestUrl.pathname];

  if (needsCanonicalHost || needsHttps) {
    const url = new URL(`${requestUrl.pathname}${requestUrl.search}`, CANONICAL_ORIGIN);

    return permanentRedirect(url);
  }

  if (canonicalPath) {
    const url = request.nextUrl.clone();
    url.pathname = canonicalPath;

    return permanentRedirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
