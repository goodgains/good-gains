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

const dataDir = path.join(process.cwd(), "data");
const licensesFilePath = path.join(dataDir, "licenses.json");
const BUNDLE_ID = "good-gains-trading-toolkit";
const TEST_LICENSE_RECORD: LicenseRecord = {
  license_key: "GGI-TEST-1234",
  customer_email: "test@example.com",
  product_id: "gg-stochastic-momentum-index",
  bundle_id: null,
  payment_status: "COMPLETED",
  created_at: "2026-04-27T00:00:00.000Z",
  status: "active"
};

async function ensureLicensesFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(licensesFilePath);
  } catch {
    await fs.writeFile(licensesFilePath, "[]", "utf8");
  }

  const raw = await fs.readFile(licensesFilePath, "utf8");
  const records = JSON.parse(raw.replace(/^\uFEFF/, "")) as LicenseRecord[];
  const hasTestRecord = records.some((record) => record.license_key === TEST_LICENSE_RECORD.license_key);

  if (!hasTestRecord) {
    records.push(TEST_LICENSE_RECORD);
    await fs.writeFile(licensesFilePath, JSON.stringify(records, null, 2), "utf8");
  }
}

export async function readLicenseRecords() {
  await ensureLicensesFile();
  const raw = await fs.readFile(licensesFilePath, "utf8");
  return JSON.parse(raw.replace(/^\uFEFF/, "")) as LicenseRecord[];
}

async function writeLicenseRecords(records: LicenseRecord[]) {
  await ensureLicensesFile();
  const withoutDuplicateTest = records.filter((record) => record.license_key !== TEST_LICENSE_RECORD.license_key);
  withoutDuplicateTest.push(TEST_LICENSE_RECORD);
  await fs.writeFile(licensesFilePath, JSON.stringify(withoutDuplicateTest, null, 2), "utf8");
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

function normalizeValue(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
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

export async function verifyProductLicense(input: { licenseKey?: string; product?: string }) {
  const normalizedKey = input.licenseKey?.trim().toUpperCase() ?? "";
  const normalizedProduct = normalizeValue(input.product);

  if (!normalizedKey || !normalizedProduct) {
    return null;
  }

  const records = await readLicenseRecords();

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

  const records = await readLicenseRecords();
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
