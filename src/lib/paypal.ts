import { getBaseUrl } from "@/lib/base-url";
export { getBaseUrl } from "@/lib/base-url";

type PayPalAccessTokenResponse = {
  access_token: string;
};

type PayPalLink = {
  href: string;
  rel: string;
  method?: string;
};

type PayPalCreateOrderResponse = {
  id: string;
  links: PayPalLink[];
};

type PayPalOrderDetailsResponse = {
  id: string;
  status: string;
  create_time?: string;
  update_time?: string;
  payer?: {
    email_address?: string;
    name?: {
      given_name?: string;
      surname?: string;
    };
  };
  purchase_units?: Array<{
    custom_id?: string;
  }>;
};

type PayPalCaptureOrderResponse = {
  id: string;
  status: string;
  create_time?: string;
  update_time?: string;
  payer?: {
    email_address?: string;
    name?: {
      given_name?: string;
      surname?: string;
    };
  };
  purchase_units?: Array<{
    custom_id?: string;
  }>;
};

type PayPalCustomIdPayload = {
  productName: string;
  couponCode?: string;
  customerEmail?: string;
};

function getPayPalApiBaseUrl() {
  return process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function getPayPalCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientId.includes("replace_me") || clientSecret.includes("replace_me")) {
    return null;
  }

  return { clientId, clientSecret };
}

export function isPayPalConfigured() {
  return Boolean(getPayPalCredentials());
}

export function encodePayPalCustomId(payload: PayPalCustomIdPayload) {
  return JSON.stringify(payload);
}

export function parsePayPalCustomId(customId?: string | null) {
  if (!customId) {
    return null;
  }

  try {
    const parsed = JSON.parse(customId) as PayPalCustomIdPayload;

    if (!parsed.productName) {
      return null;
    }

    return {
      productName: parsed.productName,
      couponCode: parsed.couponCode || null,
      customerEmail: parsed.customerEmail?.trim().toLowerCase() || null
    };
  } catch {
    return {
      productName: customId,
      couponCode: null,
      customerEmail: null
    };
  }
}

async function getPayPalAccessToken() {
  const credentials = getPayPalCredentials();

  if (!credentials) {
    throw new Error("PayPal checkout is not configured yet. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
  }

  const auth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64");
  const response = await fetch(`${getPayPalApiBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    throw new Error(`PayPal token request failed: ${await response.text()}`);
  }

  const data = (await response.json()) as PayPalAccessTokenResponse;
  return data.access_token;
}

export async function getPayPalOrder(orderId: string) {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${getPayPalApiBaseUrl()}/v2/checkout/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`PayPal order fetch failed: ${await response.text()}`);
  }

  return (await response.json()) as PayPalOrderDetailsResponse;
}

export async function createPayPalOrder(input: {
  customId: string;
  description: string;
  amount: number;
}) {
  const accessToken = await getPayPalAccessToken();
  const baseUrl = getBaseUrl();
  const response = await fetch(`${getPayPalApiBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          description: input.description,
          custom_id: input.customId,
          amount: {
            currency_code: "USD",
            value: input.amount.toFixed(2)
          }
        }
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Good Gains Indicators",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: `${baseUrl}/api/paypal/capture`,
            cancel_url: `${baseUrl}/cancel`
          }
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`PayPal order creation failed: ${await response.text()}`);
  }

  const order = (await response.json()) as PayPalCreateOrderResponse;
  const approveLink = order.links.find((link) => link.rel === "payer-action" || link.rel === "approve");

  if (!approveLink?.href) {
    throw new Error("PayPal did not return an approval link.");
  }

  return {
    id: order.id,
    approveUrl: approveLink.href
  };
}

export async function capturePayPalOrder(orderId: string) {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${getPayPalApiBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`PayPal order capture failed: ${await response.text()}`);
  }

  return (await response.json()) as PayPalCaptureOrderResponse;
}
