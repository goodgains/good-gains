import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
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

const dataDir = path.join(process.cwd(), "data");
const licensesFilePath = path.join(dataDir, "licenses.json");
const BUNDLE_ID = "good-gains-trading-toolkit";
const STATELESS_LICENSE_PREFIX = "GGI2-";
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

  if (!normalizedKey.startsWith(STATELESS_LICENSE_PREFIX)) {
    return null;
  }

  const encoded = normalizedKey.slice(STATELESS_LICENSE_PREFIX.length);
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
  const payload = buildStatelessLicensePayload(input);
  const payloadEncoded = toBase64Url(JSON.stringify(payload));
  return `${STATELESS_LICENSE_PREFIX}${payloadEncoded}.${signLicensePayload(payloadEncoded)}`;
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
