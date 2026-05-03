import crypto from "node:crypto";
import {
  createDeliveryRecord,
  createDownloadAccessCookieValue,
  DOWNLOAD_ACCESS_COOKIE,
  getDeliveryBySessionId
} from "@/lib/delivery";
import {
  getManagedLicenseOwnership,
  logSupabaseDeliveryEvent,
  upgradeLicenseDeviceLimit
} from "@/lib/customer-db";
import { sendPurchaseEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/base-url";
import { siteConfig } from "@/lib/site";

type PaddleEnvironment = "sandbox" | "production";

export type PaddleCheckoutType = "standard" | "bundle_device_upgrade";
export type PaddlePaymentMethod = "paypal" | "paddle";

type PaddleCustomDataPayload = {
  productName: string;
  couponCode?: string | null;
  customerEmail?: string | null;
  deviceCount?: 1 | 2;
  checkoutType?: PaddleCheckoutType;
  licenseKey?: string | null;
  upgradeToDevices?: 1 | 2;
};

type PaddleTransactionItem = {
  quantity?: number;
  price?: {
    name?: string;
    description?: string | null;
    unit_price?: {
      amount?: string;
      currency_code?: string;
    };
    product?: {
      name?: string;
      description?: string | null;
      tax_category?: string;
    };
  };
};

type PaddleTransaction = {
  id: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  custom_data?: unknown;
  items?: PaddleTransactionItem[];
};

type PaddleCreateTransactionResponse = {
  data: PaddleTransaction;
};

type PaddleTransactionResponse = {
  data: PaddleTransaction;
};

type PaddleWebhookEvent = {
  event_type?: string;
  data?: PaddleTransaction;
};

type PaddleFulfillmentResult =
  | {
      kind: "download";
      token: string;
      customerEmail: string;
    }
  | {
      kind: "bundle_upgrade";
      customerEmail: string;
      licenseKey: string;
    };

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeLicenseKey(value?: string | null) {
  return value?.trim().toUpperCase() ?? "";
}

function normalizeDeviceCount(value?: number | null): 1 | 2 {
  return value === 2 ? 2 : 1;
}

export function getPaddleEnvironment(): PaddleEnvironment {
  return process.env.PADDLE_ENV?.trim().toLowerCase() === "production" ? "production" : "sandbox";
}

function getPaddleApiBaseUrl() {
  return getPaddleEnvironment() === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
}

function getPaddleApiKey() {
  const apiKey = process.env.PADDLE_API_KEY?.trim();

  if (!apiKey || apiKey.includes("replace_me")) {
    return null;
  }

  return apiKey;
}

export function getPaddleClientToken() {
  const clientToken = process.env.PADDLE_CLIENT_TOKEN?.trim();

  if (!clientToken || clientToken.includes("replace_me")) {
    return null;
  }

  return clientToken;
}

export function isPaddleConfigured() {
  return Boolean(getPaddleApiKey() && getPaddleClientToken());
}

function getPaddleWebhookSecret() {
  const secret = process.env.PADDLE_WEBHOOK_SECRET?.trim();

  if (!secret || secret.includes("replace_me")) {
    return null;
  }

  return secret;
}

async function paddleRequest<T>(path: string, init?: RequestInit) {
  const apiKey = getPaddleApiKey();

  if (!apiKey) {
    throw new Error("Paddle checkout is not configured yet. Add PADDLE_API_KEY and PADDLE_CLIENT_TOKEN.");
  }

  const response = await fetch(`${getPaddleApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`Paddle request failed (${response.status}): ${await response.text()}`);
  }

  return (await response.json()) as T;
}

export function encodePaddleCustomData(payload: PaddleCustomDataPayload) {
  return payload;
}

export function parsePaddleCustomData(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as PaddleCustomDataPayload;
  const productName = payload.productName?.trim();

  if (!productName) {
    return null;
  }

  return {
    productName,
    couponCode: payload.couponCode?.trim() || null,
    customerEmail: normalizeEmail(payload.customerEmail),
    deviceCount: normalizeDeviceCount(payload.deviceCount),
    checkoutType: payload.checkoutType === "bundle_device_upgrade" ? "bundle_device_upgrade" : "standard",
    licenseKey: normalizeLicenseKey(payload.licenseKey),
    upgradeToDevices: normalizeDeviceCount(payload.upgradeToDevices)
  };
}

export async function createPaddleTransaction(input: {
  productName: string;
  description: string;
  amount: number;
  customData: PaddleCustomDataPayload;
}) {
  const response = await paddleRequest<PaddleCreateTransactionResponse>("/transactions", {
    method: "POST",
    body: JSON.stringify({
      collection_mode: "automatic",
      currency_code: "USD",
      custom_data: encodePaddleCustomData(input.customData),
      items: [
        {
          quantity: 1,
          price: {
            name: input.productName,
            description: input.description,
            unit_price: {
              amount: Math.round(input.amount * 100).toString(),
              currency_code: "USD"
            },
            product: {
              name: input.productName,
              description: input.description,
              tax_category: "standard"
            }
          }
        }
      ]
    })
  });

  return response.data;
}

export async function getPaddleTransaction(transactionId: string) {
  const response = await paddleRequest<PaddleTransactionResponse>(`/transactions/${encodeURIComponent(transactionId)}`);
  return response.data;
}

function parsePaddleSignatureHeader(header: string) {
  const parts = header
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const values = new Map<string, string>();

  for (const part of parts) {
    const [rawKey, rawValue] = part.split("=", 2);
    if (!rawKey || !rawValue) continue;
    values.set(rawKey.trim(), rawValue.trim());
  }

  const timestamp = values.get("ts");
  const signature = values.get("h1");

  if (!timestamp || !signature) {
    return null;
  }

  return { timestamp, signature };
}

export function verifyPaddleWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | null;
}) {
  const secret = getPaddleWebhookSecret();

  if (!secret) {
    throw new Error("Paddle webhook verification is not configured yet. Add PADDLE_WEBHOOK_SECRET.");
  }

  if (!input.signatureHeader) {
    return false;
  }

  const parsed = parsePaddleSignatureHeader(input.signatureHeader);

  if (!parsed) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${parsed.timestamp}:${input.rawBody}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(parsed.signature, "utf8");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

async function sendPurchaseEmailAndLog(
  record: Awaited<ReturnType<typeof createDeliveryRecord>>,
  context: string
) {
  console.log("Paddle email send attempt", {
    customerEmail: record.customerEmail,
    to: record.customerEmail,
    product: record.purchasedProductName,
    licenseKey: record.licenseKey
  });

  try {
    const emailResult = await sendPurchaseEmail(record);
    console.log("Paddle email sent successfully", {
      provider: emailResult.mode,
      resendMessageId: emailResult.id,
      status: "status" in emailResult ? emailResult.status : null,
      from: emailResult.from,
      replyTo: emailResult.replyTo,
      providerResponse: "providerResponse" in emailResult ? emailResult.providerResponse : null,
      to: record.customerEmail,
      product: record.purchasedProductName,
      licenseKey: record.licenseKey
    });

    await logSupabaseDeliveryEvent({
      customerId: record.customerId,
      orderId: record.orderId,
      licenseId: record.licenseId,
      context,
      to: record.customerEmail,
      from: emailResult.from,
      replyTo: emailResult.replyTo,
      provider: "resend",
      sent: true,
      messageId: emailResult.id ?? null,
      providerResponse: "providerResponse" in emailResult ? emailResult.providerResponse : null
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Paddle email failed", {
      to: record.customerEmail,
      product: record.purchasedProductName,
      licenseKey: record.licenseKey,
      resendError: errorMessage
    });

    await logSupabaseDeliveryEvent({
      customerId: record.customerId,
      orderId: record.orderId,
      licenseId: record.licenseId,
      context,
      to: record.customerEmail,
      from: process.env.RESEND_FROM_EMAIL?.trim() || siteConfig.supportEmail,
      replyTo: siteConfig.supportEmail,
      provider: "resend",
      sent: false,
      error: errorMessage
    });
  }
}

export async function fulfillPaddleTransaction(
  transactionId: string,
  context: "paddle_success" | "paddle_webhook"
): Promise<PaddleFulfillmentResult> {
  const existingRecord = await getDeliveryBySessionId(transactionId);

  if (existingRecord) {
    return {
      kind: "download",
      token: existingRecord.token,
      customerEmail: existingRecord.customerEmail
    };
  }

  const transaction = await getPaddleTransaction(transactionId);
  const customData = parsePaddleCustomData(transaction.custom_data);

  if (!customData) {
    throw new Error("Paddle transaction is missing valid custom_data.");
  }

  const customerEmail = normalizeEmail(customData.customerEmail);
  if (!customerEmail) {
    throw new Error("Paddle transaction is missing the delivery email.");
  }

  if (customData.checkoutType === "bundle_device_upgrade") {
    const licenseKey = normalizeLicenseKey(customData.licenseKey);

    if (!licenseKey) {
      throw new Error("Paddle bundle upgrade is missing a license key.");
    }

    const upgradedLicense = await upgradeLicenseDeviceLimit({
      customerEmail,
      licenseKey,
      maxDevices: customData.upgradeToDevices
    });

    if (!upgradedLicense) {
      throw new Error("Unable to upgrade the bundle license to 2 devices.");
    }

    const ownership = await getManagedLicenseOwnership({
      email: customerEmail,
      licenseKey
    });

    await logSupabaseDeliveryEvent({
      customerId: ownership?.customerId ?? null,
      orderId: ownership?.orderId ?? null,
      licenseId: ownership?.licenseId ?? null,
      context,
      to: customerEmail,
      from: siteConfig.supportEmail,
      replyTo: siteConfig.supportEmail,
      provider: "paddle",
      sent: true,
      providerResponse: {
        transactionId,
        upgradedToDevices: customData.upgradeToDevices
      }
    });

    return {
      kind: "bundle_upgrade",
      customerEmail,
      licenseKey
    };
  }

  if (!["completed", "paid", "billed"].includes(transaction.status.toLowerCase())) {
    throw new Error(`Paddle transaction is not ready for fulfillment. Current status: ${transaction.status}`);
  }

  const record = await createDeliveryRecord({
    stripeSessionId: transaction.id,
    paymentProvider: "paddle",
    paymentStatus: "COMPLETED",
    customerEmail,
    customerName: "Trader",
    productName: customData.productName,
    maxDevices: customData.deviceCount,
    couponCode: customData.couponCode ?? null,
    createdAt: transaction.created_at ?? transaction.updated_at ?? new Date().toISOString()
  });

  await sendPurchaseEmailAndLog(record, context);

  return {
    kind: "download",
    token: record.token,
    customerEmail: record.customerEmail
  };
}

export function createPaddleDownloadResponse(result: Extract<PaddleFulfillmentResult, { kind: "download" }>) {
  const response = Response.redirect(`${getBaseUrl()}/downloads/${result.token}`, 302);
  const nextResponse = new Response(response.body, response);
  nextResponse.headers.append(
    "Set-Cookie",
    `${DOWNLOAD_ACCESS_COOKIE}=${encodeURIComponent(
      createDownloadAccessCookieValue(result.token, result.customerEmail)
    )}; Path=/; HttpOnly; SameSite=Lax; Secure`
  );
  return nextResponse;
}
