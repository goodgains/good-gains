import { NextResponse } from "next/server";
import {
  createProductUpdateRecord,
  getProductUpdateRecipients,
  logProductUpdateEmailEvent,
  markProductUpdateSent
} from "@/lib/customer-db";
import { sendProductUpdateEmail } from "@/lib/email";
import { getProductBySlug } from "@/lib/products";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getBaseUrl } from "@/lib/base-url";

type SendProductUpdateBody = {
  product_id?: string;
  version?: string;
  title?: string;
  changelog?: string;
  dryRun?: boolean;
};

function normalizeText(value?: string) {
  return value?.trim() ?? "";
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        success: false,
        message: "Supabase is not configured."
      },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as SendProductUpdateBody;
  const productId = normalizeText(body.product_id);
  const version = normalizeText(body.version);
  const title = normalizeText(body.title);
  const changelog = normalizeText(body.changelog);
  const dryRun = body.dryRun !== false;

  const product = getProductBySlug(productId);

  if (!product) {
    return NextResponse.json(
      {
        success: false,
        message: "Unknown product_id."
      },
      { status: 400 }
    );
  }

  if (!version || !title || !changelog) {
    return NextResponse.json(
      {
        success: false,
        message: "product_id, version, title, and changelog are required."
      },
      { status: 400 }
    );
  }

  const recipients = await getProductUpdateRecipients(product.slug);
  const emails = recipients.map((recipient) => recipient.customerEmail);

  if (dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      product_id: product.slug,
      product_name: product.name,
      version,
      recipientCount: recipients.length,
      emails
    });
  }

  const downloadUrl = `${getBaseUrl()}/recover-license`;
  const productUpdate = await createProductUpdateRecord({
    productId: product.slug,
    productName: product.name,
    version,
    title,
    changelog,
    downloadUrl
  });

  if (!productUpdate) {
    return NextResponse.json(
      {
        success: false,
        message: "Could not create product update record."
      },
      { status: 500 }
    );
  }

  let sentCount = 0;
  let failedCount = 0;
  const failures: Array<{ email: string; error: string }> = [];

  for (const recipient of recipients) {
    try {
      const emailResult = await sendProductUpdateEmail({
        customerEmail: recipient.customerEmail,
        productName: product.name,
        version,
        title,
        changelog
      });

      await logProductUpdateEmailEvent({
        productUpdateId: productUpdate.id,
        customerEmail: recipient.customerEmail,
        licenseKey: recipient.licenseKey,
        status: "sent",
        resendMessageId: emailResult.id ?? null
      });

      sentCount += 1;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      await logProductUpdateEmailEvent({
        productUpdateId: productUpdate.id,
        customerEmail: recipient.customerEmail,
        licenseKey: recipient.licenseKey,
        status: "failed",
        error: errorMessage
      });

      failedCount += 1;
      failures.push({
        email: recipient.customerEmail,
        error: errorMessage
      });
    }
  }

  await markProductUpdateSent(productUpdate.id);

  return NextResponse.json({
    success: failedCount === 0,
    dryRun: false,
    product_update_id: productUpdate.id,
    product_id: product.slug,
    product_name: product.name,
    version,
    recipientCount: recipients.length,
    sentCount,
    failedCount,
    failures
  });
}
