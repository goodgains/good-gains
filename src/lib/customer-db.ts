import type { DeliveryRecord } from "@/lib/delivery";
import { bundle, getProductBySlug, products } from "@/lib/products";
import { supabaseRequest, isSupabaseConfigured } from "@/lib/supabase";

type CustomerRow = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
};

type OrderRow = {
  id: string;
  external_order_id: string;
  payment_provider: DeliveryRecord["paymentProvider"];
  payment_status: DeliveryRecord["paymentStatus"];
  customer_id: string;
  customer_name: string;
  purchased_product_name: string;
  purchased_slugs: string[];
  bundle_id: string | null;
  coupon_code: string | null;
  amount_usd: number | null;
  currency: string;
  download_token: string;
  expires_at: string | null;
  max_downloads: number;
  download_count: number;
  device_count: number;
  created_at: string;
  updated_at: string;
};

type LicenseRow = {
  id: string;
  license_key: string;
  customer_id: string;
  order_id: string;
  status: "active" | "disabled" | "refunded";
  payment_status: DeliveryRecord["paymentStatus"];
  max_devices: number;
  machine_ids: string[] | null;
  reset_count: number;
  max_resets: number;
  last_reset_at: string | null;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
};

type LicenseProductRow = {
  id: string;
  license_id: string;
  product_slug: string;
  product_name: string;
  created_at: string;
};

type DeliveryLogRow = {
  id: string;
  customer_id: string | null;
  order_id: string | null;
  license_id: string | null;
  context: string;
  email_to: string;
  email_from: string;
  reply_to: string | null;
  provider: string;
  sent: boolean;
  message_id: string | null;
  error: string | null;
  provider_response: unknown;
  created_at: string;
};

type ProductUpdateRow = {
  id: string;
  product_id: string;
  product_name: string;
  version: string;
  title: string;
  changelog: string;
  download_url: string;
  created_at: string;
  sent_at: string | null;
};

type ProductUpdateEmailLogRow = {
  id: string;
  product_update_id: string;
  customer_email: string;
  license_key: string;
  status: "sent" | "failed";
  resend_message_id: string | null;
  error: string | null;
  created_at: string;
};

type LicenseResetTokenRow = {
  id: string;
  license_id: string;
  customer_email: string;
  license_key: string;
  verification_code_hash: string;
  request_ip: string | null;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
};

type LicenseResetLogRow = {
  id: string;
  license_id: string | null;
  customer_email: string;
  license_key: string | null;
  request_ip: string | null;
  action: "request" | "verify";
  status: "sent" | "consumed" | "failed" | "rate_limited" | "reset_limit_reached";
  error: string | null;
  created_at: string;
};

type PersistedDeliveryIds = {
  customerId: string;
  orderId: string;
  licenseId: string;
};

type RecoveryPurchase = {
  customerId: string;
  customerEmail: string;
  customerName: string;
  orderId: string;
  licenseId: string;
  productName: string;
  purchasedSlugs: string[];
  licenseKey: string;
  downloadToken: string;
  createdAt: string;
  expiresAt: string | null;
};

export type ProductUpdateRecipient = {
  customerId: string;
  customerEmail: string;
  customerName: string;
  orderId: string;
  licenseId: string;
  licenseKey: string;
  productSlug: string;
  productName: string;
  purchasedSlugs: string[];
  orderCreatedAt: string;
};

export type ManagedLicenseOwnership = {
  customerId: string;
  customerEmail: string;
  customerName: string;
  orderId: string;
  downloadToken: string;
  purchasedProductName: string;
  purchasedSlugs: string[];
  licenseId: string;
  licenseKey: string;
  maxDevices: number;
  paymentStatus: DeliveryRecord["paymentStatus"];
  status: "active" | "disabled" | "refunded";
  isBundlePurchase: boolean;
};

export type SupabaseVerifiedLicense = {
  license_key: string;
  customer_email: string;
  product_id: string | null;
  bundle_id: string | null;
  payment_status: DeliveryRecord["paymentStatus"];
  created_at: string;
  status: "active" | "disabled" | "refunded";
  max_devices: number;
  machine_ids: string[];
  reset_count: number;
  max_resets: number;
  last_reset_at: string | null;
  activated_at: string | null;
};

export type SupabaseLicenseVerificationResult =
  | {
      valid: true;
      message: string;
      license: SupabaseVerifiedLicense;
    }
  | {
      valid: false;
      message: string;
    };

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function normalizeMachineId(machineId?: string | null) {
  return machineId?.trim().toLowerCase() ?? "";
}

function normalizeMachineIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return [...new Set(value.map((entry) => normalizeMachineId(String(entry ?? ""))).filter(Boolean))];
}

function encodeFilterValue(value: string) {
  return encodeURIComponent(value);
}

function encodeInFilter(values: string[]) {
  return values.map((value) => `"${value.replaceAll('"', '\\"')}"`).join(",");
}

function getProductName(slug: string) {
  return getProductBySlug(slug)?.name ?? slug;
}

function mapLicenseRowsToProductSlugs(rows: LicenseProductRow[]) {
  return [...new Set(rows.map((row) => row.product_slug))];
}

function mapSupabaseRowsToDeliveryRecord(input: {
  customer: CustomerRow;
  order: OrderRow;
  license: LicenseRow;
  licenseProducts: LicenseProductRow[];
}): DeliveryRecord {
  const slugs =
    input.order.purchased_slugs?.length > 0
      ? input.order.purchased_slugs
      : mapLicenseRowsToProductSlugs(input.licenseProducts);

  return {
    id: input.order.id,
    customerId: input.customer.id,
    orderId: input.order.id,
    licenseId: input.license.id,
    token: input.order.download_token,
    stripeSessionId: input.order.external_order_id,
    paymentProvider: input.order.payment_provider,
    paymentStatus: input.order.payment_status,
    customerEmail: normalizeEmail(input.customer.email),
    customerName: input.order.customer_name || input.customer.name || "Trader",
    purchasedProductName: input.order.purchased_product_name,
    purchasedSlugs: slugs,
    licenseKey: input.license.license_key,
    status: input.license.status,
    expiresAt: input.order.expires_at,
    maxDownloads: input.order.max_downloads,
    downloadCount: input.order.download_count,
    maxDevices: input.license.max_devices ?? input.order.device_count ?? 1,
    createdAt: input.order.created_at,
    updatedAt: input.order.updated_at,
    couponCode: input.order.coupon_code
  };
}

async function selectCustomersByEmail(email: string) {
  const response = await supabaseRequest<CustomerRow[]>(
    `customers?select=*&email=eq.${encodeFilterValue(email)}&limit=1`
  );
  return response.data?.[0] ?? null;
}

async function upsertCustomer(input: {
  email: string;
  name: string;
}) {
  const now = new Date().toISOString();
  const response = await supabaseRequest<CustomerRow[]>("customers?on_conflict=email&select=*", {
    method: "POST",
    body: [
      {
        email: normalizeEmail(input.email),
        name: input.name || "Trader",
        updated_at: now
      }
    ],
    prefer: ["resolution=merge-duplicates", "return=representation"]
  });

  const customer = response.data?.[0];

  if (!customer) {
    throw new Error("Supabase customer upsert returned no record.");
  }

  return customer;
}

async function upsertOrder(input: {
  customerId: string;
  record: DeliveryRecord;
  amountUsd?: number | null;
}) {
  const response = await supabaseRequest<OrderRow[]>(
    "orders?on_conflict=external_order_id&select=*",
    {
      method: "POST",
      body: [
        {
          external_order_id: input.record.stripeSessionId,
          payment_provider: input.record.paymentProvider,
          payment_status: input.record.paymentStatus,
          customer_id: input.customerId,
          customer_name: input.record.customerName,
          purchased_product_name: input.record.purchasedProductName,
          purchased_slugs: input.record.purchasedSlugs,
          bundle_id: input.record.purchasedSlugs.length > 1 ? bundle.id : null,
          coupon_code: input.record.couponCode ?? null,
          amount_usd: input.amountUsd ?? null,
          currency: "USD",
          download_token: input.record.token,
          expires_at: input.record.expiresAt,
          max_downloads: input.record.maxDownloads,
          download_count: input.record.downloadCount,
          device_count: input.record.maxDevices,
          created_at: input.record.createdAt,
          updated_at: input.record.updatedAt
        }
      ],
      prefer: ["resolution=merge-duplicates", "return=representation"]
    }
  );

  const order = response.data?.[0];

  if (!order) {
    throw new Error("Supabase order upsert returned no record.");
  }

  return order;
}

async function upsertLicense(input: {
  customerId: string;
  orderId: string;
  record: DeliveryRecord;
}) {
  const existingLicense = await selectLicenseByKey(input.record.licenseKey);
  const maxDevices = Math.max(input.record.maxDevices, existingLicense?.max_devices ?? 1);
  const response = await supabaseRequest<LicenseRow[]>(
    "licenses?on_conflict=license_key&select=*",
    {
      method: "POST",
      body: [
        {
          license_key: input.record.licenseKey,
          customer_id: input.customerId,
          order_id: input.orderId,
          status: "active",
          payment_status: input.record.paymentStatus,
          max_devices: maxDevices,
          created_at: input.record.createdAt,
          updated_at: input.record.updatedAt
        }
      ],
      prefer: ["resolution=merge-duplicates", "return=representation"]
    }
  );

  const license = response.data?.[0];

  if (!license) {
    throw new Error("Supabase license upsert returned no record.");
  }

  return license;
}

async function replaceLicenseProducts(licenseId: string, slugs: string[]) {
  await supabaseRequest<LicenseProductRow[]>(
    `license_products?license_id=eq.${encodeFilterValue(licenseId)}`,
    {
      method: "DELETE",
      prefer: ["return=minimal"]
    }
  );

  const payload = slugs.map((slug) => ({
    license_id: licenseId,
    product_slug: slug,
    product_name: getProductName(slug)
  }));

  const response = await supabaseRequest<LicenseProductRow[]>("license_products?select=*", {
    method: "POST",
    body: payload,
    prefer: ["return=representation"]
  });

  return response.data ?? [];
}

async function selectOrdersByToken(token: string) {
  const response = await supabaseRequest<OrderRow[]>(
    `orders?select=*&download_token=eq.${encodeFilterValue(token)}&limit=1`
  );
  return response.data?.[0] ?? null;
}

async function selectOrdersByExternalOrderId(externalOrderId: string) {
  const response = await supabaseRequest<OrderRow[]>(
    `orders?select=*&external_order_id=eq.${encodeFilterValue(externalOrderId)}&limit=1`
  );
  return response.data?.[0] ?? null;
}

async function selectLicensesByOrderId(orderId: string) {
  const response = await supabaseRequest<LicenseRow[]>(
    `licenses?select=*&order_id=eq.${encodeFilterValue(orderId)}&limit=1`
  );
  return response.data?.[0] ?? null;
}

async function selectLicenseProductsByLicenseId(licenseId: string) {
  const response = await supabaseRequest<LicenseProductRow[]>(
    `license_products?select=*&license_id=eq.${encodeFilterValue(licenseId)}`
  );
  return response.data ?? [];
}

async function selectCustomerById(customerId: string) {
  const response = await supabaseRequest<CustomerRow[]>(
    `customers?select=*&id=eq.${encodeFilterValue(customerId)}&limit=1`
  );
  return response.data?.[0] ?? null;
}

async function selectLicenseByKey(licenseKey: string) {
  const response = await supabaseRequest<LicenseRow[]>(
    `licenses?select=*&license_key=eq.${encodeFilterValue(licenseKey)}&limit=1`
  );
  return response.data?.[0] ?? null;
}

async function updateLicenseDeviceState(input: {
  license: LicenseRow;
  machineIds: string[];
  activatedAt: string | null;
}) {
  const response = await supabaseRequest<LicenseRow[]>(
    `licenses?id=eq.${encodeFilterValue(input.license.id)}&select=*`,
    {
      method: "PATCH",
      body: {
        machine_ids: input.machineIds,
        activated_at: input.activatedAt,
        updated_at: new Date().toISOString()
      },
      prefer: ["return=representation"]
    }
  );

  return response.data?.[0] ?? input.license;
}

async function selectLicensesByIds(licenseIds: string[]) {
  if (licenseIds.length === 0) {
    return [];
  }

  const response = await supabaseRequest<LicenseRow[]>(
    `licenses?select=*&id=in.(${encodeInFilter(licenseIds)})`
  );
  return response.data ?? [];
}

async function selectCustomersByIds(customerIds: string[]) {
  if (customerIds.length === 0) {
    return [];
  }

  const response = await supabaseRequest<CustomerRow[]>(
    `customers?select=*&id=in.(${encodeInFilter(customerIds)})`
  );
  return response.data ?? [];
}

async function selectLicenseProductsByProductSlug(productSlug: string) {
  const response = await supabaseRequest<LicenseProductRow[]>(
    `license_products?select=*&product_slug=eq.${encodeFilterValue(productSlug)}`
  );
  return response.data ?? [];
}

function matchesRequestedProduct(slugs: string[], requestedProduct: string) {
  const normalized = requestedProduct.trim().toLowerCase();

  if (normalized === bundle.name.toLowerCase() || normalized === bundle.slug.toLowerCase()) {
    return slugs.length > 1;
  }

  return slugs.some((slug) => {
    const product = getProductBySlug(slug);

    return (
      slug.toLowerCase() === normalized ||
      product?.name.toLowerCase() === normalized ||
      product?.slug.toLowerCase() === normalized
    );
  });
}

export async function persistSupabaseDeliveryRecord(
  record: DeliveryRecord,
  options?: {
    amountUsd?: number | null;
    maxDevices?: number;
  }
): Promise<PersistedDeliveryIds | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const customer = await upsertCustomer({
    email: record.customerEmail,
    name: record.customerName
  });
  const order = await upsertOrder({
    customerId: customer.id,
    record,
    amountUsd: options?.amountUsd
  });
  const license = await upsertLicense({
    customerId: customer.id,
    orderId: order.id,
    record
  });
  await replaceLicenseProducts(license.id, record.purchasedSlugs);

  return {
    customerId: customer.id,
    orderId: order.id,
    licenseId: license.id
  };
}

export async function getSupabaseDeliveryByToken(token: string) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const order = await selectOrdersByToken(token);

  if (!order) {
    return null;
  }

  const [customer, license] = await Promise.all([
    selectCustomerById(order.customer_id),
    selectLicensesByOrderId(order.id)
  ]);

  if (!customer || !license) {
    return null;
  }

  const licenseProducts = await selectLicenseProductsByLicenseId(license.id);

  return mapSupabaseRowsToDeliveryRecord({
    customer,
    order,
    license,
    licenseProducts
  });
}

export async function getSupabaseDeliveryBySessionId(sessionId: string) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const order = await selectOrdersByExternalOrderId(sessionId);

  if (!order) {
    return null;
  }

  const [customer, license] = await Promise.all([
    selectCustomerById(order.customer_id),
    selectLicensesByOrderId(order.id)
  ]);

  if (!customer || !license) {
    return null;
  }

  const licenseProducts = await selectLicenseProductsByLicenseId(license.id);

  return mapSupabaseRowsToDeliveryRecord({
    customer,
    order,
    license,
    licenseProducts
  });
}

export async function incrementSupabaseDownloadCount(token: string) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const order = await selectOrdersByToken(token);

  if (!order) {
    return null;
  }

  const nextDownloadCount = order.download_count + 1;
  const nextUpdatedAt = new Date().toISOString();

  const response = await supabaseRequest<OrderRow[]>(
    `orders?download_token=eq.${encodeFilterValue(token)}&select=*`,
    {
      method: "PATCH",
      body: {
        download_count: nextDownloadCount,
        updated_at: nextUpdatedAt
      },
      prefer: ["return=representation"]
    }
  );

  const updatedOrder = response.data?.[0];

  if (!updatedOrder) {
    return null;
  }

  const [customer, license] = await Promise.all([
    selectCustomerById(updatedOrder.customer_id),
    selectLicensesByOrderId(updatedOrder.id)
  ]);

  if (!customer || !license) {
    return null;
  }

  const licenseProducts = await selectLicenseProductsByLicenseId(license.id);

  return mapSupabaseRowsToDeliveryRecord({
    customer,
    order: updatedOrder,
    license,
    licenseProducts
  });
}

function buildVerifiedSupabaseLicense(input: {
  license: LicenseRow;
  customer: CustomerRow;
  slugs: string[];
}): SupabaseVerifiedLicense {
  return {
    license_key: input.license.license_key,
    customer_email: input.customer.email,
    product_id: input.slugs.length === 1 ? input.slugs[0] : null,
    bundle_id: input.slugs.length > 1 ? bundle.id : null,
    payment_status: input.license.payment_status,
    created_at: input.license.created_at,
    status: input.license.status,
    max_devices: input.license.max_devices ?? 1,
    machine_ids: normalizeMachineIds(input.license.machine_ids),
    reset_count: input.license.reset_count ?? 0,
    max_resets: input.license.max_resets ?? 1,
    last_reset_at: input.license.last_reset_at ?? null,
    activated_at: input.license.activated_at ?? null
  };
}

export async function verifySupabaseLicenseWithDeviceLock(input: {
  licenseKey?: string;
  product?: string;
  email?: string;
  machineId?: string;
}): Promise<SupabaseLicenseVerificationResult | undefined> {
  if (!isSupabaseConfigured()) {
    return undefined;
  }

  const normalizedLicenseKey = input.licenseKey?.trim().toUpperCase() ?? "";
  const normalizedProduct = input.product?.trim().toLowerCase() ?? "";
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedMachineId = normalizeMachineId(input.machineId);

  if (!normalizedLicenseKey) {
    return {
      valid: false,
      message: "Enter License Key"
    };
  }

  if (!normalizedProduct) {
    return {
      valid: false,
      message: "Invalid License"
    };
  }

  const license = await selectLicenseByKey(normalizedLicenseKey);

  if (!license) {
    return {
      valid: false,
      message: "Invalid License"
    };
  }

  if (license.status !== "active" || license.payment_status !== "COMPLETED") {
    return {
      valid: false,
      message: "Invalid License"
    };
  }

  const [customer, licenseProducts, orderRecord] = await Promise.all([
    selectCustomerById(license.customer_id),
    selectLicenseProductsByLicenseId(license.id),
    selectLicensesOrder(license.order_id)
  ]);

  if (!customer || !orderRecord) {
    return {
      valid: false,
      message: "Invalid License"
    };
  }

  if (normalizedEmail && normalizeEmail(customer.email) !== normalizedEmail) {
    return {
      valid: false,
      message: "Invalid License"
    };
  }

  const slugs =
    licenseProducts.length > 0 ? mapLicenseRowsToProductSlugs(licenseProducts) : orderRecord.purchased_slugs;

  if (!matchesRequestedProduct(slugs, normalizedProduct)) {
    return {
      valid: false,
      message: "Invalid License"
    };
  }

  let hydratedLicense = license;
  const knownMachineIds = normalizeMachineIds(license.machine_ids);
  const maxDevices = Math.max(1, license.max_devices ?? orderRecord.device_count ?? 1);

  if (normalizedMachineId) {
    const isKnownMachine = knownMachineIds.includes(normalizedMachineId);

    if (!isKnownMachine && knownMachineIds.length >= maxDevices) {
      return {
        valid: false,
        message: "This license is already active on another device"
      };
    }

    if (!isKnownMachine || !license.activated_at || maxDevices !== (license.max_devices ?? 1)) {
      hydratedLicense = await updateLicenseDeviceState({
        license: {
          ...license,
          max_devices: maxDevices
        },
        machineIds: isKnownMachine ? knownMachineIds : [...knownMachineIds, normalizedMachineId],
        activatedAt: license.activated_at ?? new Date().toISOString()
      });
    }
  }

  const verifiedLicense = buildVerifiedSupabaseLicense({
    license: {
      ...hydratedLicense,
      max_devices: Math.max(1, hydratedLicense.max_devices ?? maxDevices)
    },
    customer,
    slugs
  });

  return {
    valid: true,
    message: "License verified successfully.",
    license: verifiedLicense
  };
}

export async function verifySupabaseLicense(input: {
  licenseKey?: string;
  product?: string;
  email?: string;
  machineId?: string;
}) {
  const result = await verifySupabaseLicenseWithDeviceLock(input);

  if (result === undefined) {
    return undefined;
  }

  if (!result.valid) {
    return null;
  }

  return result.license;
}

async function selectLicensesOrder(orderId: string) {
  const response = await supabaseRequest<OrderRow[]>(
    `orders?select=*&id=eq.${encodeFilterValue(orderId)}&limit=1`
  );
  return response.data?.[0] ?? null;
}

export async function getManagedLicenseOwnership(input: {
  email: string;
  licenseKey: string;
}) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const ownership = await selectCustomerOwnedLicense({
    email: input.email,
    licenseKey: input.licenseKey
  });

  if (!ownership) {
    return null;
  }

  const [order, licenseProducts] = await Promise.all([
    selectLicensesOrder(ownership.license.order_id),
    selectLicenseProductsByLicenseId(ownership.license.id)
  ]);

  if (!order) {
    return null;
  }

  const slugs =
    licenseProducts.length > 0 ? mapLicenseRowsToProductSlugs(licenseProducts) : order.purchased_slugs;
  const isBundlePurchase =
    order.bundle_id === bundle.id ||
    order.purchased_product_name.trim().toLowerCase() === bundle.name.toLowerCase() ||
    slugs.length > 1;

  return {
    customerId: ownership.customer.id,
    customerEmail: normalizeEmail(ownership.customer.email),
    customerName: order.customer_name || ownership.customer.name || "Trader",
    orderId: order.id,
    downloadToken: order.download_token,
    purchasedProductName: order.purchased_product_name,
    purchasedSlugs: slugs,
    licenseId: ownership.license.id,
    licenseKey: ownership.license.license_key,
    maxDevices: Math.max(1, ownership.license.max_devices ?? order.device_count ?? 1),
    paymentStatus: ownership.license.payment_status,
    status: ownership.license.status,
    isBundlePurchase
  } satisfies ManagedLicenseOwnership;
}

export async function logSupabaseDeliveryEvent(input: {
  customerId?: string | null;
  orderId?: string | null;
  licenseId?: string | null;
  context: string;
  to: string;
  from?: string | null;
  replyTo?: string | null;
  provider: string;
  sent: boolean;
  messageId?: string | null;
  error?: string | null;
  providerResponse?: unknown;
}) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const response = await supabaseRequest<DeliveryLogRow[]>("delivery_logs?select=*", {
    method: "POST",
    body: [
      {
        customer_id: input.customerId ?? null,
        order_id: input.orderId ?? null,
        license_id: input.licenseId ?? null,
        context: input.context,
        email_to: input.to,
        email_from: input.from ?? "",
        reply_to: input.replyTo ?? null,
        provider: input.provider,
        sent: input.sent,
        message_id: input.messageId ?? null,
        error: input.error ?? null,
        provider_response: input.providerResponse ?? null
      }
    ],
    prefer: ["return=representation"]
  });

  return response.data?.[0] ?? null;
}

async function selectCustomerOwnedLicense(input: {
  email: string;
  licenseKey: string;
}) {
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedLicenseKey = input.licenseKey.trim().toUpperCase();

  const [customer, license] = await Promise.all([
    selectCustomersByEmail(normalizedEmail),
    selectLicenseByKey(normalizedLicenseKey)
  ]);

  if (!customer || !license) {
    return null;
  }

  if (license.customer_id !== customer.id) {
    return null;
  }

  return {
    customer,
    license
  };
}

async function selectLicenseResetLogsByField(input: {
  field: "customer_email" | "request_ip";
  value: string;
  sinceIso: string;
}) {
  if (!input.value) {
    return [];
  }

  const response = await supabaseRequest<LicenseResetLogRow[]>(
    `license_reset_logs?select=*&${input.field}=eq.${encodeFilterValue(input.value)}&created_at=gte.${encodeFilterValue(input.sinceIso)}`
  );
  return response.data ?? [];
}

async function selectPendingLicenseResetToken(input: {
  customerEmail: string;
  licenseKey: string;
  verificationCodeHash: string;
  nowIso: string;
}) {
  const response = await supabaseRequest<LicenseResetTokenRow[]>(
    `license_reset_tokens?select=*&customer_email=eq.${encodeFilterValue(normalizeEmail(input.customerEmail))}&license_key=eq.${encodeFilterValue(input.licenseKey.trim().toUpperCase())}&verification_code_hash=eq.${encodeFilterValue(input.verificationCodeHash)}&consumed_at=is.null&expires_at=gte.${encodeFilterValue(input.nowIso)}&order=created_at.desc&limit=1`
  );
  return response.data?.[0] ?? null;
}

export async function countRecentLicenseResetAttempts(input: {
  customerEmail: string;
  requestIp: string;
  windowMinutes: number;
}) {
  if (!isSupabaseConfigured()) {
    return 0;
  }

  const sinceIso = new Date(Date.now() - input.windowMinutes * 60 * 1000).toISOString();
  const [emailLogs, ipLogs] = await Promise.all([
    selectLicenseResetLogsByField({
      field: "customer_email",
      value: normalizeEmail(input.customerEmail),
      sinceIso
    }),
    selectLicenseResetLogsByField({
      field: "request_ip",
      value: input.requestIp,
      sinceIso
    })
  ]);

  return new Set([...emailLogs, ...ipLogs].map((entry) => entry.id)).size;
}

export async function createLicenseResetToken(input: {
  customerEmail: string;
  licenseKey: string;
  verificationCodeHash: string;
  requestIp: string | null;
  expiresAt: string;
}) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const ownership = await selectCustomerOwnedLicense({
    email: input.customerEmail,
    licenseKey: input.licenseKey
  });

  if (!ownership) {
    return null;
  }

  if (ownership.license.status !== "active" || ownership.license.payment_status !== "COMPLETED") {
    return null;
  }

  if ((ownership.license.reset_count ?? 0) >= (ownership.license.max_resets ?? 1)) {
    return {
      blocked: true as const,
      reason: "reset_limit_reached",
      customer: ownership.customer,
      license: ownership.license
    };
  }

  const response = await supabaseRequest<LicenseResetTokenRow[]>("license_reset_tokens?select=*", {
    method: "POST",
    body: [
      {
        license_id: ownership.license.id,
        customer_email: normalizeEmail(input.customerEmail),
        license_key: input.licenseKey.trim().toUpperCase(),
        verification_code_hash: input.verificationCodeHash,
        request_ip: input.requestIp,
        expires_at: input.expiresAt
      }
    ],
    prefer: ["return=representation"]
  });

  return {
    blocked: false as const,
    customer: ownership.customer,
    license: ownership.license,
    token: response.data?.[0] ?? null
  };
}

export async function consumeLicenseResetToken(input: {
  customerEmail: string;
  licenseKey: string;
  verificationCodeHash: string;
}) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const token = await selectPendingLicenseResetToken({
    customerEmail: input.customerEmail,
    licenseKey: input.licenseKey,
    verificationCodeHash: input.verificationCodeHash,
    nowIso: new Date().toISOString()
  });

  if (!token) {
    return null;
  }

  const response = await supabaseRequest<LicenseResetTokenRow[]>(
    `license_reset_tokens?id=eq.${encodeFilterValue(token.id)}&select=*`,
    {
      method: "PATCH",
      body: {
        consumed_at: new Date().toISOString()
      },
      prefer: ["return=representation"]
    }
  );

  return response.data?.[0] ?? token;
}

export async function clearLicenseMachineLocks(input: {
  customerEmail: string;
  licenseKey: string;
}) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const ownership = await selectCustomerOwnedLicense({
    email: input.customerEmail,
    licenseKey: input.licenseKey
  });

  if (!ownership) {
    return null;
  }

  const nextResetCount = (ownership.license.reset_count ?? 0) + 1;
  const nowIso = new Date().toISOString();
  const response = await supabaseRequest<LicenseRow[]>(
    `licenses?id=eq.${encodeFilterValue(ownership.license.id)}&select=*`,
    {
      method: "PATCH",
      body: {
        machine_ids: [],
        reset_count: nextResetCount,
        last_reset_at: nowIso,
        activated_at: null,
        updated_at: nowIso
      },
      prefer: ["return=representation"]
    }
  );

  return {
    customer: ownership.customer,
    license: response.data?.[0] ?? ownership.license
  };
}

export async function logLicenseResetEvent(input: {
  licenseId?: string | null;
  customerEmail: string;
  licenseKey?: string | null;
  requestIp?: string | null;
  action: "request" | "verify";
  status: "sent" | "consumed" | "failed" | "rate_limited" | "reset_limit_reached";
  error?: string | null;
}) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const response = await supabaseRequest<LicenseResetLogRow[]>("license_reset_logs?select=*", {
    method: "POST",
    body: [
      {
        license_id: input.licenseId ?? null,
        customer_email: normalizeEmail(input.customerEmail),
        license_key: input.licenseKey?.trim().toUpperCase() ?? null,
        request_ip: input.requestIp ?? null,
        action: input.action,
        status: input.status,
        error: input.error ?? null
      }
    ],
    prefer: ["return=representation"]
  });

  return response.data?.[0] ?? null;
}

export async function upgradeLicenseDeviceLimit(input: {
  customerEmail: string;
  licenseKey: string;
  maxDevices: number;
}) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const ownership = await selectCustomerOwnedLicense({
    email: input.customerEmail,
    licenseKey: input.licenseKey
  });

  if (!ownership) {
    return null;
  }

  const nextMaxDevices = Math.max(1, Math.min(2, input.maxDevices));
  if ((ownership.license.max_devices ?? 1) >= nextMaxDevices) {
    return ownership.license;
  }

  const response = await supabaseRequest<LicenseRow[]>(
    `licenses?id=eq.${encodeFilterValue(ownership.license.id)}&select=*`,
    {
      method: "PATCH",
      body: {
        max_devices: nextMaxDevices,
        updated_at: new Date().toISOString()
      },
      prefer: ["return=representation"]
    }
  );

  return response.data?.[0] ?? ownership.license;
}

export async function getRecoveryPurchasesByEmail(email: string): Promise<RecoveryPurchase[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const customer = await selectCustomersByEmail(normalizeEmail(email));

  if (!customer) {
    return [];
  }

  const licenseResponse = await supabaseRequest<LicenseRow[]>(
    `licenses?select=*&customer_id=eq.${encodeFilterValue(customer.id)}&status=eq.active&payment_status=eq.COMPLETED`
  );
  const licenses = licenseResponse.data ?? [];

  if (licenses.length === 0) {
    return [];
  }

  const orderIds = [...new Set(licenses.map((license) => license.order_id))];
  const licenseIds = licenses.map((license) => license.id);

  const [ordersResponse, licenseProductsResponse] = await Promise.all([
    supabaseRequest<OrderRow[]>(
      `orders?select=*&id=in.(${encodeInFilter(orderIds)})`
    ),
    supabaseRequest<LicenseProductRow[]>(
      `license_products?select=*&license_id=in.(${encodeInFilter(licenseIds)})`
    )
  ]);

  const orders = ordersResponse.data ?? [];
  const licenseProducts = licenseProductsResponse.data ?? [];
  const ordersById = new Map(orders.map((order) => [order.id, order]));

  return licenses
    .map((license) => {
      const order = ordersById.get(license.order_id);

      if (!order || order.payment_status !== "COMPLETED") {
        return null;
      }

      const productRows = licenseProducts.filter((entry) => entry.license_id === license.id);
      const slugs =
        productRows.length > 0 ? mapLicenseRowsToProductSlugs(productRows) : order.purchased_slugs;

      return {
        customerId: customer.id,
        customerEmail: customer.email,
        customerName: order.customer_name || customer.name || "Trader",
        orderId: order.id,
        licenseId: license.id,
        productName: order.purchased_product_name,
        purchasedSlugs: slugs,
        licenseKey: license.license_key,
        downloadToken: order.download_token,
        createdAt: order.created_at,
        expiresAt: order.expires_at
      } satisfies RecoveryPurchase;
    })
    .filter((entry): entry is RecoveryPurchase => Boolean(entry));
}

export async function createProductUpdateRecord(input: {
  productId: string;
  productName: string;
  version: string;
  title: string;
  changelog: string;
  downloadUrl: string;
}) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const response = await supabaseRequest<ProductUpdateRow[]>("product_updates?select=*", {
    method: "POST",
    body: [
      {
        product_id: input.productId,
        product_name: input.productName,
        version: input.version,
        title: input.title,
        changelog: input.changelog,
        download_url: input.downloadUrl
      }
    ],
    prefer: ["return=representation"]
  });

  return response.data?.[0] ?? null;
}

export async function markProductUpdateSent(productUpdateId: string) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const response = await supabaseRequest<ProductUpdateRow[]>(
    `product_updates?id=eq.${encodeFilterValue(productUpdateId)}&select=*`,
    {
      method: "PATCH",
      body: {
        sent_at: new Date().toISOString()
      },
      prefer: ["return=representation"]
    }
  );

  return response.data?.[0] ?? null;
}

export async function logProductUpdateEmailEvent(input: {
  productUpdateId: string;
  customerEmail: string;
  licenseKey: string;
  status: "sent" | "failed";
  resendMessageId?: string | null;
  error?: string | null;
}) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const response = await supabaseRequest<ProductUpdateEmailLogRow[]>(
    "product_update_email_logs?select=*",
    {
      method: "POST",
      body: [
        {
          product_update_id: input.productUpdateId,
          customer_email: normalizeEmail(input.customerEmail),
          license_key: input.licenseKey,
          status: input.status,
          resend_message_id: input.resendMessageId ?? null,
          error: input.error ?? null
        }
      ],
      prefer: ["return=representation"]
    }
  );

  return response.data?.[0] ?? null;
}

export async function getProductUpdateRecipients(
  productSlug: string
): Promise<ProductUpdateRecipient[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const matchingLicenseProducts = await selectLicenseProductsByProductSlug(productSlug);

  if (matchingLicenseProducts.length === 0) {
    return [];
  }

  const licenseIds = [...new Set(matchingLicenseProducts.map((row) => row.license_id))];
  const licenses = await selectLicensesByIds(licenseIds);
  const activeLicenses = licenses.filter(
    (license) => license.status === "active" && license.payment_status === "COMPLETED"
  );

  if (activeLicenses.length === 0) {
    return [];
  }

  const activeLicenseIds = activeLicenses.map((license) => license.id);
  const [customers, ordersResponse, allLicenseProductsResponse] = await Promise.all([
    selectCustomersByIds([...new Set(activeLicenses.map((license) => license.customer_id))]),
    supabaseRequest<OrderRow[]>(
      `orders?select=*&id=in.(${encodeInFilter([...new Set(activeLicenses.map((license) => license.order_id))])})`
    ),
    supabaseRequest<LicenseProductRow[]>(
      `license_products?select=*&license_id=in.(${encodeInFilter(activeLicenseIds)})`
    )
  ]);

  const customersById = new Map(customers.map((customer) => [customer.id, customer]));
  const ordersById = new Map((ordersResponse.data ?? []).map((order) => [order.id, order]));
  const licenseProductsByLicenseId = new Map<string, LicenseProductRow[]>();

  for (const row of allLicenseProductsResponse.data ?? []) {
    const existing = licenseProductsByLicenseId.get(row.license_id) ?? [];
    existing.push(row);
    licenseProductsByLicenseId.set(row.license_id, existing);
  }

  const recipients = activeLicenses
    .map((license) => {
      const customer = customersById.get(license.customer_id);
      const order = ordersById.get(license.order_id);

      if (!customer || !order || order.payment_status !== "COMPLETED") {
        return null;
      }

      const productRows = licenseProductsByLicenseId.get(license.id) ?? [];
      const slugs =
        productRows.length > 0 ? mapLicenseRowsToProductSlugs(productRows) : order.purchased_slugs;

      if (!slugs.includes(productSlug)) {
        return null;
      }

      return {
        customerId: customer.id,
        customerEmail: normalizeEmail(customer.email),
        customerName: order.customer_name || customer.name || "Trader",
        orderId: order.id,
        licenseId: license.id,
        licenseKey: license.license_key,
        productSlug,
        productName: getProductName(productSlug),
        purchasedSlugs: slugs,
        orderCreatedAt: order.created_at
      } satisfies ProductUpdateRecipient;
    })
    .filter((entry): entry is ProductUpdateRecipient => Boolean(entry))
    .sort((left, right) => right.orderCreatedAt.localeCompare(left.orderCreatedAt));

  const uniqueRecipients = new Map<string, ProductUpdateRecipient>();

  for (const recipient of recipients) {
    if (!uniqueRecipients.has(recipient.customerEmail)) {
      uniqueRecipients.set(recipient.customerEmail, recipient);
    }
  }

  return [...uniqueRecipients.values()];
}
