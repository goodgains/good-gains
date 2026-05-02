import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { verifySupabaseLicense } from "@/lib/customer-db";
import type { DeliveryRecord } from "@/lib/delivery";
import { bundle, getProductBySlug, products } from "@/lib/products";

export type LicenseRecord = {
  license_key: string;
  customer_email: string;
  product_id: string | null;
  bundle_id: string | null;
  payment_status: "COMPLETED" | "PENDING" | "FAILED";
  created_at: string;
  status: "active";
};

type StatelessLicensePayload = {
  v: 2;
  sessionId: string;
  email: string;
  slugs: string[];
  createdAt: string;
};

type ShortLicenseScopeCode = "R" | "S" | "D" | "H" | "B";

const dataDir = path.join(process.cwd(), "data");
const licensesFilePath = path.join(dataDir, "licenses.json");
const BUNDLE_ID = "good-gains-trading-toolkit";
const SHORT_LICENSE_PREFIX = "GGI-";
const LEGACY_STATELESS_LICENSE_PREFIX = "GGI2-";
const SHORT_LICENSE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SHORT_LICENSE_GROUP_SIZE = 4;
const SHORT_LICENSE_GROUP_COUNT = 4;
const SHORT_LICENSE_NONCE_LENGTH = 8;
const SHORT_LICENSE_SIGNATURE_LENGTH = 7;
const TEST_LICENSE_RECORD: LicenseRecord = {
  license_key: "GGI-TEST-1234",
  customer_email: "test@example.com",
  product_id: "gg-stochastic-momentum-index",
  bundle_id: null,
  payment_status: "COMPLETED",
  created_at: "2026-04-27T00:00:00.000Z",
  status: "active"
};

function normalizeValue(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function encodeBase32(buffer: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += SHORT_LICENSE_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += SHORT_LICENSE_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function formatShortLicenseBody(body: string) {
  const groups: string[] = [];

  for (let index = 0; index < body.length; index += SHORT_LICENSE_GROUP_SIZE) {
    groups.push(body.slice(index, index + SHORT_LICENSE_GROUP_SIZE));
  }

  return `${SHORT_LICENSE_PREFIX}${groups.join("-")}`;
}

function getScopeCodeForSlugs(slugs: string[]): ShortLicenseScopeCode {
  const normalizedSlugs = [...new Set(slugs.map((slug) => slug.trim().toLowerCase()))].sort();

  if (normalizedSlugs.length > 1) {
    return "B";
  }

  const [slug] = normalizedSlugs;

  switch (slug) {
    case "gg-rr-trade-panel":
      return "R";
    case "gg-stochastic-momentum-index":
      return "S";
    case "daily-account-lock-addon":
      return "D";
    case "session-high-low-indicator":
      return "H";
    default:
      throw new Error(`Unsupported product slug for license generation: ${slug}`);
  }
}

function getSlugsForScopeCode(scope: ShortLicenseScopeCode) {
  switch (scope) {
    case "R":
      return ["gg-rr-trade-panel"];
    case "S":
      return ["gg-stochastic-momentum-index"];
    case "D":
      return ["daily-account-lock-addon"];
    case "H":
      return ["session-high-low-indicator"];
    case "B":
      return products.map((product) => product.slug);
    default:
      return [];
  }
}

function signShortLicense(scope: ShortLicenseScopeCode, nonce: string) {
  return encodeBase32(
    crypto.createHmac("sha256", getLicenseSigningSecret()).update(`short:${scope}:${nonce}`).digest()
  ).slice(0, SHORT_LICENSE_SIGNATURE_LENGTH);
}

function parseShortLicenseKey(licenseKey?: string | null) {
  const normalizedKey = licenseKey?.trim().toUpperCase() ?? "";

  if (!normalizedKey.startsWith(SHORT_LICENSE_PREFIX)) {
    return null;
  }

  const body = normalizedKey.slice(SHORT_LICENSE_PREFIX.length).replace(/-/g, "");
  const expectedBodyLength = SHORT_LICENSE_GROUP_SIZE * SHORT_LICENSE_GROUP_COUNT;

  if (body.length !== expectedBodyLength) {
    return null;
  }

  if (![...body].every((character) => SHORT_LICENSE_ALPHABET.includes(character))) {
    return null;
  }

  const scope = body[0] as ShortLicenseScopeCode;
  const nonce = body.slice(1, 1 + SHORT_LICENSE_NONCE_LENGTH);
  const signature = body.slice(1 + SHORT_LICENSE_NONCE_LENGTH);

  if (!["R", "S", "D", "H", "B"].includes(scope) || !nonce || !signature) {
    return null;
  }

  const expectedSignature = signShortLicense(scope, nonce);
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const actualBuffer = Buffer.from(signature, "utf8");

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return null;
  }

  return {
    scope,
    nonce,
    slugs: getSlugsForScopeCode(scope)
  };
}

function getLicenseSigningSecret() {
  return (
    process.env.LICENSE_SIGNING_SECRET ||
    process.env.DOWNLOAD_ACCESS_SECRET ||
    process.env.PAYPAL_CLIENT_SECRET ||
    "dev-license-secret"
  );
}

function signLicensePayload(payloadEncoded: string) {
  return crypto
    .createHmac("sha256", getLicenseSigningSecret())
    .update(payloadEncoded)
    .digest("base64url");
}

function buildStatelessLicensePayload(input: {
  stripeSessionId: string;
  customerEmail: string;
  purchasedSlugs: string[];
  createdAt: string;
}): StatelessLicensePayload {
  return {
    v: 2,
    sessionId: input.stripeSessionId,
    email: normalizeValue(input.customerEmail),
    slugs: [...input.purchasedSlugs].sort(),
    createdAt: input.createdAt
  };
}

function matchesRequestedProduct(slugs: string[], requestedProduct: string) {
  return slugs.some((slug) => {
    const product = getProductBySlug(slug);

    return (
      normalizeValue(slug) === requestedProduct ||
      normalizeValue(product?.slug) === requestedProduct ||
      normalizeValue(product?.name) === requestedProduct
    );
  });
}

function parseStatelessLicenseKey(licenseKey?: string | null) {
  const normalizedKey = licenseKey?.trim() ?? "";

  if (!normalizedKey.startsWith(LEGACY_STATELESS_LICENSE_PREFIX)) {
    return null;
  }

  const encoded = normalizedKey.slice(LEGACY_STATELESS_LICENSE_PREFIX.length);
  const separatorIndex = encoded.lastIndexOf(".");

  if (separatorIndex <= 0) {
    return null;
  }

  const payloadEncoded = encoded.slice(0, separatorIndex);
  const signature = encoded.slice(separatorIndex + 1);

  if (!payloadEncoded || !signature) {
    return null;
  }

  const expectedSignature = signLicensePayload(payloadEncoded);
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const actualBuffer = Buffer.from(signature, "utf8");

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadEncoded)) as StatelessLicensePayload;

    if (
      payload?.v !== 2 ||
      !payload.sessionId ||
      !payload.email ||
      !Array.isArray(payload.slugs) ||
      payload.slugs.length === 0 ||
      !payload.createdAt
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

async function readFileBackedLicenseRecords() {
  try {
    const raw = await fs.readFile(licensesFilePath, "utf8");
    const records = JSON.parse(raw.replace(/^\uFEFF/, "")) as LicenseRecord[];
    const hasTestRecord = records.some((record) => record.license_key === TEST_LICENSE_RECORD.license_key);

    return hasTestRecord ? records : [...records, TEST_LICENSE_RECORD];
  } catch {
    return [TEST_LICENSE_RECORD];
  }
}

async function writeLicenseRecords(records: LicenseRecord[]) {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    const withoutDuplicateTest = records.filter((record) => record.license_key !== TEST_LICENSE_RECORD.license_key);
    withoutDuplicateTest.push(TEST_LICENSE_RECORD);
    await fs.writeFile(licensesFilePath, JSON.stringify(withoutDuplicateTest, null, 2), "utf8");
  } catch {
    // Ignore write failures on read-only production file systems.
  }
}

function buildLicenseRecord(record: DeliveryRecord): LicenseRecord {
  const isBundle = record.purchasedSlugs.length > 1;

  return {
    license_key: record.licenseKey,
    customer_email: record.customerEmail,
    product_id: isBundle ? null : record.purchasedSlugs[0] ?? null,
    bundle_id: isBundle ? BUNDLE_ID : null,
    payment_status: record.paymentStatus,
    created_at: record.createdAt,
    status: "active"
  };
}

function matchesProduct(record: LicenseRecord, requestedProduct: string) {
  if (record.bundle_id === BUNDLE_ID) {
    return (
      products.some((product) => {
        return (
          normalizeValue(product.name) === requestedProduct ||
          normalizeValue(product.slug) === requestedProduct
        );
      }) ||
      normalizeValue(bundle.name) === requestedProduct ||
      normalizeValue(bundle.slug) === requestedProduct
    );
  }

  if (!record.product_id) {
    return false;
  }

  const product = getProductBySlug(record.product_id);
  if (!product) {
    return false;
  }

  return normalizeValue(product.name) === requestedProduct || normalizeValue(product.slug) === requestedProduct;
}

export function createLicenseKey(input: {
  stripeSessionId: string;
  customerEmail: string;
  purchasedSlugs: string[];
  createdAt: string;
}) {
  const scope = getScopeCodeForSlugs(input.purchasedSlugs);
  const nonce = encodeBase32(crypto.randomBytes(5)).slice(0, SHORT_LICENSE_NONCE_LENGTH);
  const signature = signShortLicense(scope, nonce);
  return formatShortLicenseBody(`${scope}${nonce}${signature}`);
}

export async function readLicenseRecords() {
  return readFileBackedLicenseRecords();
}

export async function verifyProductLicense(input: { licenseKey?: string; product?: string }) {
  const normalizedKey = input.licenseKey?.trim().toUpperCase() ?? "";
  const normalizedProduct = normalizeValue(input.product);

  if (!normalizedKey || !normalizedProduct) {
    return null;
  }

  try {
    const supabaseMatch = await verifySupabaseLicense({
      licenseKey: normalizedKey,
      product: normalizedProduct
    });

    if (supabaseMatch !== undefined) {
      return supabaseMatch;
    }
  } catch (error) {
    console.error("Supabase license verification failed", {
      licenseKeyPrefix: normalizedKey.slice(0, 12),
      product: normalizedProduct,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  const shortLicense = parseShortLicenseKey(normalizedKey);

  if (shortLicense && matchesRequestedProduct(shortLicense.slugs, normalizedProduct)) {
    return {
      license_key: normalizedKey,
      customer_email: "",
      product_id: shortLicense.slugs.length === 1 ? shortLicense.slugs[0] : null,
      bundle_id: shortLicense.slugs.length > 1 ? BUNDLE_ID : null,
      payment_status: "COMPLETED" as const,
      created_at: new Date(0).toISOString(),
      status: "active" as const
    };
  }

  const statelessPayload = parseStatelessLicenseKey(normalizedKey);

  if (statelessPayload && matchesRequestedProduct(statelessPayload.slugs, normalizedProduct)) {
    return {
      license_key: normalizedKey,
      customer_email: statelessPayload.email,
      product_id: statelessPayload.slugs.length === 1 ? statelessPayload.slugs[0] : null,
      bundle_id: statelessPayload.slugs.length > 1 ? BUNDLE_ID : null,
      payment_status: "COMPLETED" as const,
      created_at: statelessPayload.createdAt,
      status: "active" as const
    };
  }

  const records = await readFileBackedLicenseRecords();

  return (
    records.find((record) => {
      if (record.license_key.trim().toUpperCase() !== normalizedKey) {
        return false;
      }

      if (record.status !== "active" || record.payment_status !== "COMPLETED") {
        return false;
      }

      return matchesProduct(record, normalizedProduct);
    }) ?? null
  );
}

export async function syncLicenseRecord(record: DeliveryRecord) {
  if (record.paymentStatus !== "COMPLETED" || record.status !== "active") {
    return null;
  }

  const records = await readFileBackedLicenseRecords();
  const nextRecord = buildLicenseRecord(record);
  const existingIndex = records.findIndex((entry) => entry.license_key === nextRecord.license_key);

  if (existingIndex >= 0) {
    records[existingIndex] = nextRecord;
  } else {
    records.push(nextRecord);
  }

  await writeLicenseRecords(records);
  return nextRecord;
}

export async function syncLicensesFromDeliveryRecords(records: DeliveryRecord[]) {
  const filtered = records.filter(
    (record) => record.paymentStatus === "COMPLETED" && record.status === "active"
  );

  const nextRecords = filtered.map(buildLicenseRecord);
  await writeLicenseRecords(nextRecords);
  return nextRecords;
}
