import { NextResponse } from "next/server";
import {
  createTemporaryUnlockToken,
  createDownloadAccessCookieValue,
  DOWNLOAD_ACCESS_COOKIE,
  verifyDownloadAccessByEmail
} from "@/lib/delivery";

type AccessBody = {
  token?: string;
  email?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as AccessBody;
  const token = body.token?.trim();
  const email = body.email?.trim().toLowerCase();

  if (!token || !email) {
    return NextResponse.json({ error: "Token and email are required." }, { status: 400 });
  }


  const record = await verifyDownloadAccessByEmail(token, email);

  if (!record) {
    return NextResponse.json({ success: false, error: "Email does not match the purchase email." }, { status: 403 });
  }

  const response = NextResponse.json({
    success: true,
    redirectUrl: `/downloads/${record.token}?unlock=${createTemporaryUnlockToken(record.token, record.customerEmail)}`
  });
  response.cookies.set({
    name: DOWNLOAD_ACCESS_COOKIE,
    value: createDownloadAccessCookieValue(record.token, record.customerEmail),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: record.expiresAt ? new Date(record.expiresAt) : undefined
  });

  return response;
}


