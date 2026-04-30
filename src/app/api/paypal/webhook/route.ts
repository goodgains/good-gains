import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  return NextResponse.json({
    received: true,
    provider: "paypal",
    note: "Webhook endpoint is available for future PayPal event verification and audit logging.",
    eventType: body?.event_type ?? null
  });
}
