import { promises as fs } from "node:fs";
import path from "node:path";
import { DeliveryRecord, buildPrivateDownloadUrl, getDeliveryDownloadData } from "@/lib/delivery";
import { getBaseUrl } from "@/lib/base-url";
import { bundleDownload } from "@/lib/downloads";
import { siteConfig } from "@/lib/site";

export type LicenseRecoveryEntry = {
  productName: string;
  licenseKey: string;
  downloadToken: string;
  createdAt: string;
  purchasedSlugs: string[];
};

export type ProductUpdateEmailInput = {
  customerEmail: string;
  productName: string;
  version: string;
  title: string;
  changelog: string;
};

function resolveConfiguredEmail(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized || !normalized.includes("@")) {
    return null;
  }

  return normalized;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildEmailContent(record: DeliveryRecord) {
  const downloadUrl = buildPrivateDownloadUrl(record.token);
  const { releases, hasBundlePurchase } = getDeliveryDownloadData(record);

  const textLines = [
    `Product: ${record.purchasedProductName}`,
    `License key: ${record.licenseKey}`,
    `Private download page: ${downloadUrl}`,
    "",
    "Short installation instructions:"
  ];

  if (hasBundlePurchase) {
    textLines.push("Import each included ZIP into NinjaTrader 8 using Tools > Import > NinjaScript Add-On.");
    textLines.push("Use the same license key for every included Good Gains tool.");
    textLines.push("Open each tool after import and keep your license key available.");
  } else {
    releases[0]?.release.installNotes.forEach((note) => textLines.push(`- ${note}`));
  }

  const releasesHtml = releases
    .map(
      ({ product, release }) => `
        <tr>
          <td style="padding:12px 0;border-top:1px solid #27272a;color:#ffffff;font-weight:600;">${escapeHtml(product.name)}</td>
          <td style="padding:12px 0;border-top:1px solid #27272a;color:#d4d4d8;">${escapeHtml(release.version)}</td>
        </tr>
      `
    )
    .join("");

  const installList =
    (hasBundlePurchase ? bundleDownload.installNotes : releases[0]?.release.installNotes) ?? [];

  const html = `
    <div style="background:#09090b;padding:32px;font-family:Arial,sans-serif;color:#e4e4e7;">
      <div style="max-width:720px;margin:0 auto;border:1px solid rgba(255,255,255,0.08);border-radius:24px;background:#111115;padding:32px;">
        <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.28em;text-transform:uppercase;color:#6ee7b7;">Good Gains Delivery</p>
        <h1 style="margin:0 0 12px;font-size:32px;line-height:1.2;color:#ffffff;">Your ${escapeHtml(record.purchasedProductName)} order is ready</h1>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.8;color:#d4d4d8;">
          Thank you for your purchase. Your private download page and license key are ready below.
        </p>

        <div style="border:1px solid rgba(255,255,255,0.08);border-radius:20px;background:#09090b;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.24em;color:#a1a1aa;">License Key</p>
          <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">${escapeHtml(record.licenseKey)}</p>
        </div>

        <a href="${downloadUrl}" style="display:inline-block;padding:14px 24px;border-radius:999px;background:#6ee7b7;color:#000000;font-weight:700;text-decoration:none;">
          Open Private Download Page
        </a>

        <p style="margin:16px 0 0;font-size:14px;color:#d4d4d8;">
          ${escapeHtml(downloadUrl)}
        </p>

        <div style="margin-top:28px;border:1px solid rgba(255,255,255,0.08);border-radius:20px;background:#09090b;padding:20px;">
          <p style="margin:0 0 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.24em;color:#a1a1aa;">Included Downloads</p>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr>
                <th align="left" style="padding-bottom:8px;color:#71717a;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.18em;">Product</th>
                <th align="left" style="padding-bottom:8px;color:#71717a;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.18em;">Version</th>
              </tr>
            </thead>
            <tbody>${releasesHtml}</tbody>
          </table>
        </div>

        <div style="margin-top:24px;">
          <p style="margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:0.24em;color:#a1a1aa;">Short Installation Instructions</p>
          <ul style="margin:0;padding-left:18px;color:#d4d4d8;line-height:1.8;">
            ${installList.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>

        <p style="margin-top:24px;font-size:15px;color:#ffffff;font-weight:600;">
          Lifetime updates + ongoing improvements
        </p>
        <p style="margin:8px 0 0;font-size:14px;line-height:1.8;color:#a1a1aa;">
          Need help installing your files? Reply to this email or contact ${escapeHtml(siteConfig.supportEmail)}.
        </p>
      </div>
    </div>
  `;

  return {
    subject: "Your Good Gains download + license key",
    text: textLines.join("\n"),
    html
  };
}

function hasRealResendConfig() {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = resolveConfiguredEmail(process.env.RESEND_FROM_EMAIL);

  if (!resendApiKey || !fromEmail) {
    return false;
  }

  if (resendApiKey === "re_replace_me") {
    return false;
  }

  return true;
}

async function writePreviewEmail(record: DeliveryRecord, content: { subject: string; text: string }) {
  try {
    const previewDir = path.join(process.cwd(), "data", "email-previews");
    await fs.mkdir(previewDir, { recursive: true });
    const previewPath = path.join(previewDir, `${record.id}.txt`);
    await fs.writeFile(
      previewPath,
      `TO: ${record.customerEmail}\nSUBJECT: ${content.subject}\n\n${content.text}`,
      "utf8"
    );
  } catch {
    // Ignore preview write failures on read-only production file systems.
  }
}

function buildSupportMessageContent(input: {
  name: string;
  email: string;
  topic: string;
  message: string;
}) {
  const safeName = input.name.trim() || "Unknown";
  const safeEmail = input.email.trim().toLowerCase();
  const safeTopic = input.topic.trim() || "General support";
  const safeMessage = input.message.trim();

  return {
    subject: `Support request: ${safeTopic}`,
    text: [
      `Name: ${safeName}`,
      `Email: ${safeEmail}`,
      `Topic: ${safeTopic}`,
      "",
      safeMessage
    ].join("\n"),
    html: `
      <div style="background:#09090b;padding:32px;font-family:Arial,sans-serif;color:#e4e4e7;">
        <div style="max-width:720px;margin:0 auto;border:1px solid rgba(255,255,255,0.08);border-radius:24px;background:#111115;padding:32px;">
          <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.28em;text-transform:uppercase;color:#6ee7b7;">Support Message</p>
          <h1 style="margin:0 0 18px;font-size:28px;line-height:1.2;color:#ffffff;">${escapeHtml(safeTopic)}</h1>
          <div style="border:1px solid rgba(255,255,255,0.08);border-radius:20px;background:#09090b;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:14px;color:#d4d4d8;"><strong>Name:</strong> ${escapeHtml(safeName)}</p>
            <p style="margin:0;font-size:14px;color:#d4d4d8;"><strong>Email:</strong> ${escapeHtml(safeEmail)}</p>
          </div>
          <div style="border:1px solid rgba(255,255,255,0.08);border-radius:20px;background:#09090b;padding:20px;">
            <p style="margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:0.24em;color:#a1a1aa;">Message</p>
            <p style="margin:0;font-size:15px;line-height:1.8;color:#e4e4e7;white-space:pre-wrap;">${escapeHtml(safeMessage)}</p>
          </div>
        </div>
      </div>
    `
  };
}

function buildLicenseRecoveryContent(input: {
  customerEmail: string;
  entries: LicenseRecoveryEntry[];
}) {
  const sortedEntries = [...input.entries].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );

  const textLines = [
    "Here are your Good Gains license details and private download links:",
    ""
  ];

  for (const entry of sortedEntries) {
    textLines.push(`Product: ${entry.productName}`);
    textLines.push(`License key: ${entry.licenseKey}`);
    textLines.push(`Download page: ${buildPrivateDownloadUrl(entry.downloadToken)}`);
    textLines.push("");
  }

  const cardsHtml = sortedEntries
    .map((entry) => {
      const downloadUrl = buildPrivateDownloadUrl(entry.downloadToken);

      return `
        <div style="border:1px solid rgba(255,255,255,0.08);border-radius:20px;background:#09090b;padding:20px;margin-top:16px;">
          <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.24em;color:#a1a1aa;">${escapeHtml(entry.productName)}</p>
          <p style="margin:10px 0 0;font-size:22px;font-weight:700;color:#ffffff;">${escapeHtml(entry.licenseKey)}</p>
          <p style="margin:12px 0 0;font-size:14px;line-height:1.8;color:#d4d4d8;">Download page:</p>
          <a href="${downloadUrl}" style="display:inline-block;margin-top:8px;color:#6ee7b7;text-decoration:none;font-weight:600;">
            ${escapeHtml(downloadUrl)}
          </a>
        </div>
      `;
    })
    .join("");

  const html = `
    <div style="background:#09090b;padding:32px;font-family:Arial,sans-serif;color:#e4e4e7;">
      <div style="max-width:720px;margin:0 auto;border:1px solid rgba(255,255,255,0.08);border-radius:24px;background:#111115;padding:32px;">
        <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.28em;text-transform:uppercase;color:#6ee7b7;">License Recovery</p>
        <h1 style="margin:0 0 12px;font-size:32px;line-height:1.2;color:#ffffff;">Your Good Gains licenses</h1>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.8;color:#d4d4d8;">
          We found active purchases for ${escapeHtml(input.customerEmail)}. Your license keys and private download pages are listed below.
        </p>
        ${cardsHtml}
        <p style="margin:24px 0 0;font-size:14px;line-height:1.8;color:#a1a1aa;">
          Need help installing your files? Reply to this email or contact ${escapeHtml(siteConfig.supportEmail)}.
        </p>
      </div>
    </div>
  `;

  return {
    subject: "Your Good Gains license recovery details",
    text: textLines.join("\n"),
    html
  };
}

function buildProductUpdateContent(input: ProductUpdateEmailInput) {
  const recoverUrl = `${getBaseUrl()}/recover-license`;
  const safeTitle = input.title.trim();
  const safeChangelog = input.changelog.trim();
  const safeProductName = input.productName.trim();
  const safeVersion = input.version.trim();

  const text = [
    `New update available: ${safeProductName} v${safeVersion}`,
    "",
    safeTitle,
    "",
    safeChangelog,
    "",
    `Recover your license and downloads here: ${recoverUrl}`
  ].join("\n");

  const html = `
    <div style="background:#09090b;padding:32px;font-family:Arial,sans-serif;color:#e4e4e7;">
      <div style="max-width:720px;margin:0 auto;border:1px solid rgba(255,255,255,0.08);border-radius:24px;background:#111115;padding:32px;">
        <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.28em;text-transform:uppercase;color:#6ee7b7;">Product Update</p>
        <h1 style="margin:0 0 12px;font-size:30px;line-height:1.2;color:#ffffff;">${escapeHtml(safeProductName)} v${escapeHtml(safeVersion)}</h1>
        <p style="margin:0 0 18px;font-size:18px;line-height:1.6;color:#ffffff;font-weight:600;">
          ${escapeHtml(safeTitle)}
        </p>
        <div style="border:1px solid rgba(255,255,255,0.08);border-radius:20px;background:#09090b;padding:20px;">
          <p style="margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:0.24em;color:#a1a1aa;">Changelog</p>
          <p style="margin:0;font-size:15px;line-height:1.8;color:#d4d4d8;white-space:pre-wrap;">${escapeHtml(safeChangelog)}</p>
        </div>
        <p style="margin:24px 0 0;font-size:15px;line-height:1.8;color:#d4d4d8;">
          Recover your latest download access and license details here:
        </p>
        <a href="${recoverUrl}" style="display:inline-block;margin-top:12px;padding:14px 24px;border-radius:999px;background:#6ee7b7;color:#000000;font-weight:700;text-decoration:none;">
          Open License Recovery
        </a>
        <p style="margin:16px 0 0;font-size:14px;color:#a1a1aa;">${escapeHtml(recoverUrl)}</p>
      </div>
    </div>
  `;

  return {
    subject: `New update available: ${safeProductName} v${safeVersion}`,
    text,
    html
  };
}

async function sendViaResend(input: {
  resendApiKey: string;
  from: string;
  to: string[];
  replyTo: string;
  subject: string;
  html: string;
  text: string;
}) {
  console.log("Resend request starting", {
    to: input.to,
    from: input.from,
    replyTo: input.replyTo,
    subject: input.subject
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: input.from,
      to: input.to,
      reply_to: input.replyTo,
      subject: input.subject,
      html: input.html,
      text: input.text
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Resend request failed", {
      status: response.status,
      to: input.to,
      from: input.from,
      replyTo: input.replyTo,
      subject: input.subject,
      error: errorText
    });
    throw new Error(
      `Resend email failed with status ${response.status} for from="${input.from}" replyTo="${input.replyTo}". Response: ${errorText}`
    );
  }

  const result = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  console.log("Resend request succeeded", {
    status: response.status,
    to: input.to,
    from: input.from,
    replyTo: input.replyTo,
    subject: input.subject,
    providerResponse: result
  });

  return {
    id: typeof result?.id === "string" ? result.id : null,
    status: response.status,
    result
  };
}

function isResendRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  return normalized.includes("status 429") || normalized.includes("rate_limit_exceeded");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendViaResendWithRetry(input: {
  resendApiKey: string;
  from: string;
  to: string[];
  replyTo: string;
  subject: string;
  html: string;
  text: string;
}) {
  try {
    return await sendViaResend(input);
  } catch (error) {
    if (!isResendRateLimitError(error)) {
      throw error;
    }

    console.warn("Resend rate limit hit, retrying once", {
      from: input.from,
      replyTo: input.replyTo,
      to: input.to
    });

    await delay(1250);
    return sendViaResend(input);
  }
}

export async function sendPurchaseEmail(record: DeliveryRecord) {
  const content = buildEmailContent(record);
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = resolveConfiguredEmail(process.env.RESEND_FROM_EMAIL);
  const fallbackFromEmail = resolveConfiguredEmail(process.env.RESEND_FALLBACK_FROM_EMAIL);
  const fromName = siteConfig.emailFromName;
  const replyTo = siteConfig.supportEmail;

  console.log("Preparing purchase email", {
    customerEmail: record.customerEmail,
    to: record.customerEmail,
    product: record.purchasedProductName,
    licenseKey: record.licenseKey,
    hasResendApiKey: Boolean(resendApiKey),
    fromEmail: fromEmail ?? null,
    fallbackFromEmail: fallbackFromEmail ?? null,
    replyTo
  });

  if (!hasRealResendConfig() || !resendApiKey || !fromEmail) {
    console.error("Purchase email provider configuration invalid", {
      customerEmail: record.customerEmail,
      to: record.customerEmail,
      from: fromEmail ? `${fromName} <${fromEmail}>` : null,
      replyTo,
      hasResendApiKey: Boolean(resendApiKey),
      hasResendFromEmail: Boolean(fromEmail),
      resendError: "Missing RESEND_API_KEY or RESEND_FROM_EMAIL"
    });
    await writePreviewEmail(record, content);
    throw new Error(
      `Email provider is not configured. Required env vars: RESEND_API_KEY and RESEND_FROM_EMAIL. Current from="${fromEmail ?? ""}" replyTo="${replyTo}".`
    );
  }

  const primaryFrom = `${fromName} <${fromEmail}>`;
  const fallbackFrom = fallbackFromEmail ? `${fromName} <${fallbackFromEmail}>` : null;

  try {
    const result = await sendViaResendWithRetry({
      resendApiKey,
      from: primaryFrom,
      to: [record.customerEmail],
      replyTo,
      subject: content.subject,
      html: content.html,
      text: content.text
    });

    return {
      mode: "resend" as const,
      id: result.id,
      status: result.status,
      providerResponse: result.result,
      from: primaryFrom,
      replyTo
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const shouldRetryWithFallback =
      Boolean(fallbackFromEmail && fallbackFrom) &&
      !fallbackFrom!.toLowerCase().includes(fromEmail.toLowerCase()) &&
      errorMessage.toLowerCase().includes("domain is not verified");

    if (!shouldRetryWithFallback) {
      console.error("Purchase email send failed", {
        customerEmail: record.customerEmail,
        to: record.customerEmail,
        from: primaryFrom,
        replyTo,
        resendError: errorMessage
      });
      throw error;
    }

    console.warn("Retrying purchase email with fallback sender", {
      to: record.customerEmail,
      product: record.purchasedProductName,
      primaryFrom,
      fallbackFrom,
      replyTo,
      error: errorMessage
    });

    const fallbackResult = await sendViaResendWithRetry({
      resendApiKey,
      from: fallbackFrom!,
      to: [record.customerEmail],
      replyTo,
      subject: content.subject,
      html: content.html,
      text: content.text
    });

    return {
      mode: "resend-fallback" as const,
      id: fallbackResult.id,
      status: fallbackResult.status,
      providerResponse: fallbackResult.result,
      from: fallbackFrom,
      replyTo
    };
  }
}

export async function sendSupportMessageEmail(input: {
  name: string;
  email: string;
  topic: string;
  message: string;
}) {
  const content = buildSupportMessageContent(input);
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = resolveConfiguredEmail(process.env.RESEND_FROM_EMAIL);
  const fallbackFromEmail = resolveConfiguredEmail(process.env.RESEND_FALLBACK_FROM_EMAIL);
  const fromName = siteConfig.emailFromName;
  const to = siteConfig.supportEmail;
  const replyTo = input.email.trim().toLowerCase();

  console.log("Preparing support message email", {
    customerEmail: replyTo,
    to,
    fromEmail,
    fallbackFromEmail,
    replyTo,
    topic: input.topic
  });

  if (!hasRealResendConfig() || !resendApiKey || !fromEmail) {
    throw new Error(
      `Email provider is not configured. Required env vars: RESEND_API_KEY and RESEND_FROM_EMAIL. Current from="${fromEmail ?? ""}" replyTo="${replyTo}".`
    );
  }

  const primaryFrom = `${fromName} <${fromEmail}>`;
  const fallbackFrom = fallbackFromEmail ? `${fromName} <${fallbackFromEmail}>` : null;

  try {
    const result = await sendViaResendWithRetry({
      resendApiKey,
      from: primaryFrom,
      to: [to],
      replyTo,
      subject: content.subject,
      html: content.html,
      text: content.text
    });

    return {
      mode: "resend" as const,
      id: result.id,
      status: result.status,
      providerResponse: result.result,
      from: primaryFrom,
      replyTo,
      to
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const shouldRetryWithFallback =
      Boolean(fallbackFromEmail && fallbackFrom) &&
      !fallbackFrom!.toLowerCase().includes(fromEmail.toLowerCase()) &&
      errorMessage.toLowerCase().includes("domain is not verified");

    if (!shouldRetryWithFallback) {
      throw error;
    }

    console.warn("Retrying support email with fallback sender", {
      to,
      customerEmail: replyTo,
      primaryFrom,
      fallbackFrom,
      replyTo,
      error: errorMessage
    });

    const fallbackResult = await sendViaResendWithRetry({
      resendApiKey,
      from: fallbackFrom!,
      to: [to],
      replyTo,
      subject: content.subject,
      html: content.html,
      text: content.text
    });

    return {
      mode: "resend-fallback" as const,
      id: fallbackResult.id,
      status: fallbackResult.status,
      providerResponse: fallbackResult.result,
      from: fallbackFrom!,
      replyTo,
      to
    };
  }
}

export async function sendLicenseRecoveryEmail(input: {
  customerEmail: string;
  entries: LicenseRecoveryEntry[];
}) {
  const content = buildLicenseRecoveryContent(input);
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = resolveConfiguredEmail(process.env.RESEND_FROM_EMAIL);
  const fallbackFromEmail = resolveConfiguredEmail(process.env.RESEND_FALLBACK_FROM_EMAIL);
  const fromName = siteConfig.emailFromName;
  const replyTo = siteConfig.supportEmail;

  console.log("Preparing license recovery email", {
    customerEmail: input.customerEmail,
    to: input.customerEmail,
    hasResendApiKey: Boolean(resendApiKey),
    fromEmail,
    fallbackFromEmail,
    replyTo,
    purchaseCount: input.entries.length
  });

  if (!hasRealResendConfig() || !resendApiKey || !fromEmail) {
    throw new Error(
      `Email provider is not configured. Required env vars: RESEND_API_KEY and RESEND_FROM_EMAIL. Current from="${fromEmail ?? ""}" replyTo="${replyTo}".`
    );
  }

  const primaryFrom = `${fromName} <${fromEmail}>`;
  const fallbackFrom = fallbackFromEmail ? `${fromName} <${fallbackFromEmail}>` : null;

  try {
    const result = await sendViaResendWithRetry({
      resendApiKey,
      from: primaryFrom,
      to: [input.customerEmail],
      replyTo,
      subject: content.subject,
      html: content.html,
      text: content.text
    });

    return {
      mode: "resend" as const,
      id: result.id,
      status: result.status,
      providerResponse: result.result,
      from: primaryFrom,
      replyTo,
      to: input.customerEmail
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const shouldRetryWithFallback =
      Boolean(fallbackFromEmail && fallbackFrom) &&
      !fallbackFrom!.toLowerCase().includes(fromEmail.toLowerCase()) &&
      errorMessage.toLowerCase().includes("domain is not verified");

    if (!shouldRetryWithFallback) {
      throw error;
    }

    const fallbackResult = await sendViaResendWithRetry({
      resendApiKey,
      from: fallbackFrom!,
      to: [input.customerEmail],
      replyTo,
      subject: content.subject,
      html: content.html,
      text: content.text
    });

    return {
      mode: "resend-fallback" as const,
      id: fallbackResult.id,
      status: fallbackResult.status,
      providerResponse: fallbackResult.result,
      from: fallbackFrom!,
      replyTo,
      to: input.customerEmail
    };
  }
}

export async function sendProductUpdateEmail(input: ProductUpdateEmailInput) {
  const content = buildProductUpdateContent(input);
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = resolveConfiguredEmail(process.env.RESEND_FROM_EMAIL);
  const fallbackFromEmail = resolveConfiguredEmail(process.env.RESEND_FALLBACK_FROM_EMAIL);
  const fromName = siteConfig.emailFromName;
  const replyTo = siteConfig.supportEmail;

  console.log("Preparing product update email", {
    customerEmail: input.customerEmail,
    to: input.customerEmail,
    productName: input.productName,
    version: input.version,
    hasResendApiKey: Boolean(resendApiKey),
    fromEmail,
    fallbackFromEmail,
    replyTo
  });

  if (!hasRealResendConfig() || !resendApiKey || !fromEmail) {
    throw new Error(
      `Email provider is not configured. Required env vars: RESEND_API_KEY and RESEND_FROM_EMAIL. Current from="${fromEmail ?? ""}" replyTo="${replyTo}".`
    );
  }

  const primaryFrom = `${fromName} <${fromEmail}>`;
  const fallbackFrom = fallbackFromEmail ? `${fromName} <${fallbackFromEmail}>` : null;

  try {
    const result = await sendViaResendWithRetry({
      resendApiKey,
      from: primaryFrom,
      to: [input.customerEmail],
      replyTo,
      subject: content.subject,
      html: content.html,
      text: content.text
    });

    return {
      mode: "resend" as const,
      id: result.id,
      status: result.status,
      providerResponse: result.result,
      from: primaryFrom,
      replyTo,
      to: input.customerEmail
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const shouldRetryWithFallback =
      Boolean(fallbackFromEmail && fallbackFrom) &&
      !fallbackFrom!.toLowerCase().includes(fromEmail.toLowerCase()) &&
      errorMessage.toLowerCase().includes("domain is not verified");

    if (!shouldRetryWithFallback) {
      throw error;
    }

    const fallbackResult = await sendViaResendWithRetry({
      resendApiKey,
      from: fallbackFrom!,
      to: [input.customerEmail],
      replyTo,
      subject: content.subject,
      html: content.html,
      text: content.text
    });

    return {
      mode: "resend-fallback" as const,
      id: fallbackResult.id,
      status: fallbackResult.status,
      providerResponse: fallbackResult.result,
      from: fallbackFrom!,
      replyTo,
      to: input.customerEmail
    };
  }
}


