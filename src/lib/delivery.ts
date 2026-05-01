import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createLicenseKey, verifyProductLicense } from "@/lib/licenses";
import { bundle, getProductBySlug, products } from "@/lib/products";
import { getReleaseBySlug } from "@/lib/downloads";
import { getBaseUrl } from "@/lib/paypal";

export type DeliveryRecord = {
  id: string;
  token: string;
  stripeSessionId: string;
  paymentProvider: "paypal" | "stripe" | "demo" | "coupon";
  paymentStatus: "COMPLETED" | "PENDING" | "FAILED";
  customerEmail: string;
  customerName: string;
  purchasedProductName: string;
  purchasedSlugs: string[];
  licenseKey: string;
  status: "active";
  expiresAt: string | null;
  maxDownloads: number;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
};

type StatelessDeliveryPayload = {
  v: 1;
  id: string;
  sessionId: string;
  provider: DeliveryRecord["paymentProvider"];
  paymentStatus: DeliveryRecord["paymentStatus"];
  email: string;
  name: string;
  productName: string;
  slugs: string[];
  licenseKey: string;
  expiresAt: string | null;
  maxDownloads: number;
  createdAt: string;
  updatedAt: string;
};

const dataDir = path.join(process.cwd(), "data");
const recordsPath = path.join(dataDir, "delivery-records.json");
const DEFAULT_TOKEN_EXPIRATION_HOURS = 48;
const DEFAULT_MAX_DOWNLOADS = 10;
const STATELESS_DELIVERY_PREFIX = "GGD1-";
export const DOWNLOAD_ACCESS_COOKIE = "ggi_download_access";

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getDeliveryTokenSecret() {
  return (
    process.env.DELIVERY_TOKEN_SECRET ||
    process.env.DOWNLOAD_ACCESS_SECRET ||
    process.env.PAYPAL_CLIENT_SECRET ||
    "dev-delivery-secret"
  );
}

function signDeliveryPayload(payloadEncoded: string) {
  return crypto
    .createHmac("sha256", getDeliveryTokenSecret())
    .update(payloadEncoded)
    .digest("base64url");
}

function buildStatelessDeliveryToken(payload: StatelessDeliveryPayload) {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  return `${STATELESS_DELIVERY_PREFIX}${encodedPayload}.${signDeliveryPayload(encodedPayload)}`;
}

function buildStatelessDeliveryPayload(record: DeliveryRecord): StatelessDeliveryPayload {
  return {
    v: 1,
    id: record.id,
    sessionId: record.stripeSessionId,
    provider: record.paymentProvider,
    paymentStatus: record.paymentStatus,
    email: record.customerEmail,
    name: record.customerName,
    productName: record.purchasedProductName,
    slugs: record.purchasedSlugs,
    licenseKey: record.licenseKey,
    expiresAt: record.expiresAt,
    maxDownloads: record.maxDownloads,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function parseStatelessDeliveryToken(token: string) {
  if (!token.startsWith(STATELESS_DELIVERY_PREFIX)) {
    return null;
  }

  const encoded = token.slice(STATELESS_DELIVERY_PREFIX.length);
  const separatorIndex = encoded.lastIndexOf(".");

  if (separatorIndex <= 0) {
    return null;
  }

  const payloadEncoded = encoded.slice(0, separatorIndex);
  const signature = encoded.slice(separatorIndex + 1);

  if (!payloadEncoded || !signature) {
    return null;
  }

  const expectedSignature = signDeliveryPayload(payloadEncoded);
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const actualBuffer = Buffer.from(signature, "utf8");

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadEncoded)) as StatelessDeliveryPayload;

    if (
      payload?.v !== 1 ||
      !payload.id ||
      !payload.sessionId ||
      !payload.email ||
      !payload.productName ||
      !Array.isArray(payload.slugs) ||
      payload.slugs.length === 0 ||
      !payload.licenseKey ||
      !payload.createdAt ||
      !payload.updatedAt
    ) {
      return null;
    }

    const record: DeliveryRecord = {
      id: payload.id,
      token,
      stripeSessionId: payload.sessionId,
      paymentProvider: payload.provider,
      paymentStatus: payload.paymentStatus,
      customerEmail: normalizeEmail(payload.email),
      customerName: payload.name || "Trader",
      purchasedProductName: payload.productName,
      purchasedSlugs: payload.slugs,
      licenseKey: payload.licenseKey,
      status: "active",
      expiresAt: payload.expiresAt,
      maxDownloads: payload.maxDownloads || DEFAULT_MAX_DOWNLOADS,
      downloadCount: 0,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt
    };

    return record;
  } catch {
    return null;
  }
}

async function readLegacyRecords() {
  try {
    const raw = await fs.readFile(recordsPath, "utf8");
    const records = JSON.parse(raw.replace(/^\uFEFF/, "")) as Partial<DeliveryRecord>[];

    return records.map((record) => {
      const paymentProvider =
        record.paymentProvider ??
        (record.stripeSessionId?.startsWith("demo_") ? "demo" : "paypal");
      const paymentStatus =
        record.paymentStatus ??
        (record.stripeSessionId?.startsWith("demo_") ? "PENDING" : "COMPLETED");

      return {
        id: record.id ?? crypto.randomUUID(),
        token: record.token ?? crypto.randomBytes(24).toString("hex"),
        stripeSessionId: record.stripeSessionId ?? "",
        paymentProvider,
        paymentStatus,
        customerEmail: normalizeEmail(record.customerEmail),
        customerName: record.customerName ?? "Trader",
        purchasedProductName: record.purchasedProductName ?? "",
        purchasedSlugs: record.purchasedSlugs ?? [],
        licenseKey: record.licenseKey ?? "",
        status: record.status ?? "active",
        expiresAt: record.expiresAt ?? null,
        maxDownloads: record.maxDownloads ?? DEFAULT_MAX_DOWNLOADS,
        downloadCount: record.downloadCount ?? 0,
        createdAt: record.createdAt ?? new Date().toISOString(),
        updatedAt: record.updatedAt ?? new Date().toISOString()
      } satisfies DeliveryRecord;
    });
  } catch {
    return [];
  }
}

export function resolvePurchase(productName: string) {
  const normalized = productName.trim().toLowerCase();

  if (normalized === bundle.name.toLowerCase()) {
    return {
      name: bundle.name,
      slugs: products.map((product) => product.slug)
    };
  }

  const product = products.find((entry) => entry.name.toLowerCase() === normalized);

  if (!product) {
    throw new Error(`Unknown product: ${productName}`);
  }

  return {
    name: product.name,
    slugs: [product.slug]
  };
}

export async function getDeliveryByToken(token: string) {
  const statelessRecord = parseStatelessDeliveryToken(token);

  if (statelessRecord) {
    return statelessRecord;
  }

  const records = await readLegacyRecords();
  return records.find((record) => record.token === token) ?? null;
}

export async function getDeliveryBySessionId(sessionId: string) {
  const records = await readLegacyRecords();
  return records.find((record) => record.stripeSessionId === sessionId) ?? null;
}

export async function createDeliveryRecord(input: {
  stripeSessionId: string;
  paymentProvider?: DeliveryRecord["paymentProvider"];
  paymentStatus?: DeliveryRecord["paymentStatus"];
  customerEmail: string;
  customerName?: string | null;
  productName: string;
  createdAt?: string;
  expiresAt?: string | null;
  maxDownloads?: number;
}) {
  const resolved = resolvePurchase(input.productName);
  const customerEmail = normalizeEmail(input.customerEmail);
  const timestamp = input.createdAt ?? new Date().toISOString();
  const timestampMs = new Date(timestamp).getTime();
  const expirationBaseMs = Number.isNaN(timestampMs) ? Date.now() : timestampMs;
  const expiresAt =
    input.expiresAt ??
    new Date(expirationBaseMs + DEFAULT_TOKEN_EXPIRATION_HOURS * 60 * 60 * 1000).toISOString();
  const licenseKey = createLicenseKey({
    stripeSessionId: input.stripeSessionId,
    customerEmail,
    purchasedSlugs: resolved.slugs,
    createdAt: timestamp
  });

  const record: DeliveryRecord = {
    id: crypto.createHash("sha256").update(`${input.stripeSessionId}:${customerEmail}`).digest("hex").slice(0, 24),
    token: "",
    stripeSessionId: input.stripeSessionId,
    paymentProvider: input.paymentProvider ?? "paypal",
    paymentStatus: input.paymentStatus ?? "COMPLETED",
    customerEmail,
    customerName: input.customerName?.trim() || "Trader",
    purchasedProductName: resolved.name,
    purchasedSlugs: resolved.slugs,
    licenseKey,
    status: "active",
    expiresAt,
    maxDownloads: input.maxDownloads ?? DEFAULT_MAX_DOWNLOADS,
    downloadCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  record.token = buildStatelessDeliveryToken(buildStatelessDeliveryPayload(record));

  return record;
}

function isDeliveryRecordAccessible(record: DeliveryRecord) {
  if (record.status !== "active") return false;
  if (record.paymentStatus !== "COMPLETED") return false;
  if (record.downloadCount >= record.maxDownloads) return false;

  if (record.expiresAt) {
    const expiresAtMs = new Date(record.expiresAt).getTime();

    if (!Number.isNaN(expiresAtMs) && expiresAtMs < Date.now()) {
      return false;
    }
  }

  return true;
}

function getAccessSecret() {
  return process.env.DOWNLOAD_ACCESS_SECRET || process.env.PAYPAL_CLIENT_SECRET || "dev-download-secret";
}

function buildAccessSignature(token: string, email: string) {
  return crypto
    .createHmac("sha256", getAccessSecret())
    .update(`${token}:${normalizeEmail(email)}`)
    .digest("hex");
}

export function createDownloadAccessCookieValue(token: string, email: string) {
  const normalizedEmail = normalizeEmail(email);
  return `${token}:${normalizedEmail}:${buildAccessSignature(token, normalizedEmail)}`;
}

function buildTemporaryUnlockSignature(token: string, email: string) {
  return crypto
    .createHmac("sha256", getAccessSecret())
    .update(`unlock:${token}:${normalizeEmail(email)}`)
    .digest("hex");
}

export function createTemporaryUnlockToken(token: string, email: string) {
  return buildTemporaryUnlockSignature(token, email);
}

export function hasTemporaryUnlockAccess(record: DeliveryRecord, unlockToken?: string | null) {
  if (!unlockToken) return false;
  return unlockToken === buildTemporaryUnlockSignature(record.token, record.customerEmail);
}

export function hasDownloadAccess(record: DeliveryRecord, cookieValue?: string | null) {
  if (!cookieValue) return false;

  const [token, email, signature] = cookieValue.split(":");

  if (!token || !email || !signature) return false;
  if (token !== record.token) return false;
  if (email !== record.customerEmail) return false;

  return signature === buildAccessSignature(token, email);
}

export async function getValidatedDeliveryByToken(token: string) {
  const record = await getDeliveryByToken(token);

  if (!record || !isDeliveryRecordAccessible(record)) {
    return null;
  }

  return record;
}

export async function getValidatedDeliveryBySessionId(sessionId: string) {
  const record = await getDeliveryBySessionId(sessionId);

  if (!record || !isDeliveryRecordAccessible(record)) {
    return null;
  }

  return record;
}

export async function verifyDownloadAccessByEmail(token: string, email: string) {
  const record = await getValidatedDeliveryByToken(token);

  if (!record) {
    return null;
  }

  if (record.customerEmail !== normalizeEmail(email)) {
    return null;
  }

  return record;
}

export async function incrementDownloadCount(token: string) {
  const record = await getValidatedDeliveryByToken(token);

  if (!record) {
    return null;
  }

  return {
    ...record,
    updatedAt: new Date().toISOString()
  };
}

export async function verifyLicense(input: {
  licenseKey?: string;
  email?: string;
  product?: string;
}) {
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedProduct = input.product?.trim();

  if (!input.licenseKey?.trim() || !normalizedProduct) {
    return null;
  }

  const licenseMatch = await verifyProductLicense({
    licenseKey: input.licenseKey,
    product: normalizedProduct
  });

  if (!licenseMatch) {
    return null;
  }

  if (normalizedEmail && normalizeEmail(licenseMatch.customer_email) !== normalizedEmail) {
    return null;
  }

  const requestedProduct = normalizedProduct.toLowerCase();

  if (requestedProduct === bundle.name.toLowerCase() || requestedProduct === bundle.slug.toLowerCase()) {
    return bundle.slug;
  }

  const product = products.find(
    (entry) =>
      entry.slug.toLowerCase() === requestedProduct || entry.name.toLowerCase() === requestedProduct
  );

  return product?.slug ?? null;
}

export function buildPrivateDownloadUrl(token: string) {
  return `${getBaseUrl()}/downloads/${token}`;
}

export function getDeliveryDownloadData(record: DeliveryRecord) {
  const releases = record.purchasedSlugs
    .map((slug) => {
      const product = getProductBySlug(slug);
      const release = getReleaseBySlug(slug);

      if (!product || !release) {
        return null;
      }

      return {
        slug,
        product,
        release
      };
    })
    .filter(
      (
        item
      ): item is {
        slug: string;
        product: NonNullable<ReturnType<typeof getProductBySlug>>;
        release: NonNullable<ReturnType<typeof getReleaseBySlug>>;
      } => Boolean(item)
    );

  return {
    releases,
    hasBundlePurchase: record.purchasedSlugs.length > 1
  };
}
