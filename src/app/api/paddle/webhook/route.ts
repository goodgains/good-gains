import { NextResponse } from "next/server";
import {
  fulfillPaddleTransaction,
  verifyPaddleWebhookSignature
} from "@/lib/paddle";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("Paddle-Signature");

  try {
    const isValid = verifyPaddleWebhookSignature({
      rawBody,
      signatureHeader
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid Paddle webhook signature." }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as {
      event_type?: string;
      data?: { id?: string };
    };

    const eventType = event.event_type?.trim().toLowerCase();
    const transactionId = event.data?.id?.trim();

    if (!eventType || !transactionId) {
      return NextResponse.json({ received: true, ignored: true });
    }

    if (eventType === "transaction.completed" || eventType === "transaction.paid") {
      await fulfillPaddleTransaction(transactionId, "paddle_webhook");
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Paddle webhook handling failed", {
      resendError: message
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
