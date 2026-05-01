import { promises as fs } from "node:fs";
import path from "node:path";
import { DeliveryRecord, buildPrivateDownloadUrl, getDeliveryDownloadData } from "@/lib/delivery";
import { bundleDownload } from "@/lib/downloads";
import { siteConfig } from "@/lib/site";

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
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();

  if (!resendApiKey || !fromEmail) {
    return false;
  }

  if (resendApiKey === "re_replace_me") {
    return false;
  }

  return true;
}

async function writePreviewEmail(record: DeliveryRecord, content: { subject: string; text: string }) {
  const previewDir = path.join(process.cwd(), "data", "email-previews");
  await fs.mkdir(previewDir, { recursive: true });
  const previewPath = path.join(previewDir, `${record.id}.txt`);
  await fs.writeFile(
    previewPath,
    `TO: ${record.customerEmail}\nSUBJECT: ${content.subject}\n\n${content.text}`,
    "utf8"
  );
}

export async function sendPurchaseEmail(record: DeliveryRecord) {
  const content = buildEmailContent(record);
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const fromName = siteConfig.emailFromName;
  const payload = {
    from: `${fromName} <${fromEmail}>`,
    to: [record.customerEmail],
    reply_to: siteConfig.supportEmail,
    subject: content.subject,
    html: content.html,
    text: content.text
  };

  if (!hasRealResendConfig() || !resendApiKey || !fromEmail) {
    await writePreviewEmail(record, content);
    throw new Error(
      "Email provider is not configured. Add a real RESEND_API_KEY and RESEND_FROM_EMAIL to send customer emails."
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend email failed: ${errorText}`);
  }

  const result = (await response.json().catch(() => null)) as { id?: string } | null;
  return {
    mode: "resend" as const,
    id: result?.id ?? null
  };
}


