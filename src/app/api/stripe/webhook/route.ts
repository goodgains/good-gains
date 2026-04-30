import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Stripe webhook is no longer used. Payment delivery now runs through PayPal Checkout capture."
    },
    { status: 410 }
  );
}
