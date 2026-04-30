import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { syncLicenseRecord } from "@/lib/licenses";
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

const dataDir = path.join(process.cwd(), "data");
const recordsPath = path.join(dataDir, "delivery-records.json");
const DEFAULT_TOKEN_EXPIRATION_HOURS = 48;
const DEFAULT_MAX_DOWNLOADS = 10;
export const DOWNLOAD_ACCESS_COOKIE = "ggi_download_access";

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(recordsPath);
  } catch {
    await fs.writeFile(recordsPath, "[]", "utf8");
  }
}

async function readRecords() {
  await ensureDataFile();
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
      token: record.token ?? generateToken(),
      stripeSessionId: record.stripeSessionId ?? "",
      paymentProvider,
      paymentStatus,
      customerEmail: record.customerEmail ?? "",
      customerName: record.customerName ?? "Trader",
      purchasedProductName: record.purchasedProductName ?? "",
      purchasedSlugs: record.purchasedSlugs ?? [],
      licenseKey: record.licenseKey ?? generateLicenseKey(),
      status: record.status ?? "active",
      expiresAt: record.expiresAt ?? null,
      maxDownloads: record.maxDownloads ?? DEFAULT_MAX_DOWNLOADS,
      downloadCount: record.downloadCount ?? 0,
      createdAt: record.createdAt ?? new Date().toISOString(),
      updatedAt: record.updatedAt ?? new Date().toISOString()
    } satisfies DeliveryRecord;
  });
}

async function writeRecords(records: DeliveryRecord[]) {
  await ensureDataFile();
  await fs.writeFile(recordsPath, JSON.stringify(records, null, 2), "utf8");
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

function generateLicenseKey() {
  const raw = crypto.randomBytes(10).toString("hex").toUpperCase();
  const chunks = raw.match(/.{1,4}/g) ?? [];
  return `GGI-${chunks.join("-")}`;
}

function generateToken() {
  return crypto.randomBytes(24).toString("hex");
}

export async function getDeliveryByToken(token: string) {
  const records = await readRecords();
  return records.find((record) => record.token === token) ?? null;
}

export async function getDeliveryBySessionId(sessionId: string) {
  const records = await readRecords();
  return records.find((record) => record.stripeSessionId === sessionId) ?? null;
}

export async function createDeliveryRecord(input: {
  stripeSessionId: string;
  paymentProvider?: DeliveryRecord["paymentProvider"];
  paymentStatus?: DeliveryRecord["paymentStatus"];
  customerEmail: string;
  customerName?: string | null;
  productName: string;
  expiresAt?: string | null;
  maxDownloads?: number;
}) {
  const records = await readRecords();
  const existing = records.find((record) => record.stripeSessionId === input.stripeSessionId);

  if (existing) {
    if (existing.paymentStatus === "COMPLETED" && existing.status === "active") {
      await syncLicenseRecord(existing);
    }

    return existing;
  }

  const resolved = resolvePurchase(input.productName);
  const timestamp = new Date().toISOString();
  const record: DeliveryRecord = {
    id: crypto.randomUUID(),
    token: generateToken(),
    stripeSessionId: input.stripeSessionId,
    paymentProvider: input.paymentProvider ?? "paypal",
    paymentStatus: input.paymentStatus ?? "COMPLETED",
    customerEmail: input.customerEmail.trim().toLowerCase(),
    customerName: input.customerName?.trim() || "Trader",
    purchasedProductName: resolved.name,
    purchasedSlugs: resolved.slugs,
    licenseKey: generateLicenseKey(),
    status: "active",
    expiresAt:
      input.expiresAt ??
      new Date(Date.now() + DEFAULT_TOKEN_EXPIRATION_HOURS * 60 * 60 * 1000).toISOString(),
    maxDownloads: input.maxDownloads ?? DEFAULT_MAX_DOWNLOADS,
    downloadCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  records.push(record);
  await writeRecords(records);

  if (record.paymentStatus === "COMPLETED") {
    await syncLicenseRecord(record);
  }

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
    .update(`${token}:${email.trim().toLowerCase()}`)
    .digest("hex");
}

export function createDownloadAccessCookieValue(token: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return `${token}:${normalizedEmail}:${buildAccessSignature(token, normalizedEmail)}`;
}

function buildTemporaryUnlockSignature(token: string, email: string) {
  return crypto
    .createHmac("sha256", getAccessSecret())
    .update(`unlock:${token}:${email.trim().toLowerCase()}`)
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

  if (record.customerEmail !== email.trim().toLowerCase()) {
    return null;
  }

  return record;
}

export async function incrementDownloadCount(token: string) {
  const records = await readRecords();
  const index = records.findIndex((record) => record.token === token);

  if (index === -1) {
    return null;
  }

  const record = records[index];

  if (!isDeliveryRecordAccessible(record)) {
    return null;
  }

  record.downloadCount += 1;
  record.updatedAt = new Date().toISOString();
  records[index] = record;
  await writeRecords(records);
  return record;
}

export async function verifyLicense(input: {
  licenseKey?: string;
  email?: string;
  product?: string;
}) {
  const records = await readRecords();
  const normalizedKey = input.licenseKey?.trim().toUpperCase();
  const normalizedEmail = input.email?.trim().toLowerCase();
  const normalizedProduct = input.product?.trim().toLowerCase();

  if (!normalizedKey || !normalizedEmail || !normalizedProduct) {
    return null;
  }

  return (
    records.find((record) => {
      if (!isDeliveryRecordAccessible(record)) return false;
      if (record.licenseKey !== normalizedKey) return false;
      if (record.customerEmail !== normalizedEmail) return false;

      return record.purchasedSlugs.some((slug) => {
        const product = getProductBySlug(slug);
        return product?.name.toLowerCase() === normalizedProduct || slug === normalizedProduct;
      });
    }) ?? null
  );
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
