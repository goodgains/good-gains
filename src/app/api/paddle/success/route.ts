import { NextResponse } from "next/server";
import {
  createDownloadAccessCookieValue,
  DOWNLOAD_ACCESS_COOKIE
} from "@/lib/delivery";
import { getBaseUrl } from "@/lib/base-url";
import { fulfillPaddleTransaction } from "@/lib/paddle";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get("transaction_id")?.trim();

  if (!transactionId) {
    return NextResponse.redirect(new URL("/cancel", getBaseUrl()));
  }

  try {
    const result = await fulfillPaddleTransaction(transactionId, "paddle_success");

    if (result.kind === "bundle_upgrade") {
      return NextResponse.redirect(new URL("/license-activation?upgrade=success", getBaseUrl()));
    }

    const response = NextResponse.redirect(new URL(`/downloads/${result.token}`, getBaseUrl()));
    response.cookies.set({
      name: DOWNLOAD_ACCESS_COOKIE,
      value: createDownloadAccessCookieValue(result.token, result.customerEmail),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });

    return response;
  } catch (error) {
    console.error("Paddle success fulfillment failed", {
      transactionId,
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.redirect(new URL("/cancel", getBaseUrl()));
  }
}
