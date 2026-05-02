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

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
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

export async function verifySupabaseLicense(input: {
  licenseKey?: string;
  product?: string;
  email?: string;
}) {
  if (!isSupabaseConfigured()) {
    return undefined;
  }

  const normalizedLicenseKey = input.licenseKey?.trim().toUpperCase() ?? "";
  const normalizedProduct = input.product?.trim().toLowerCase() ?? "";
  const normalizedEmail = normalizeEmail(input.email);

  if (!normalizedLicenseKey || !normalizedProduct) {
    return null;
  }

  const license = await selectLicenseByKey(normalizedLicenseKey);

  if (!license) {
    return null;
  }

  if (license.status !== "active" || license.payment_status !== "COMPLETED") {
    return null;
  }

  const [customer, licenseProducts] = await Promise.all([
    selectCustomerById(license.customer_id),
    selectLicenseProductsByLicenseId(license.id)
  ]);

  const orderRecord = await selectLicensesOrder(license.order_id);

  if (!customer || !orderRecord) {
    return null;
  }

  if (normalizedEmail && normalizeEmail(customer.email) !== normalizedEmail) {
    return null;
  }

  const slugs = licenseProducts.length > 0 ? mapLicenseRowsToProductSlugs(licenseProducts) : orderRecord.purchased_slugs;

  if (!matchesRequestedProduct(slugs, normalizedProduct)) {
    return null;
  }

  return {
    license_key: license.license_key,
    customer_email: customer.email,
    product_id: slugs.length === 1 ? slugs[0] : null,
    bundle_id: slugs.length > 1 ? bundle.id : null,
    payment_status: license.payment_status,
    created_at: license.created_at,
    status: license.status
  };
}

async function selectLicensesOrder(orderId: string) {
  const response = await supabaseRequest<OrderRow[]>(
    `orders?select=*&id=eq.${encodeFilterValue(orderId)}&limit=1`
  );
  return response.data?.[0] ?? null;
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
