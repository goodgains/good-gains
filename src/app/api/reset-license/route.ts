import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  clearLicenseMachineLocks,
  consumeLicenseResetToken,
  countRecentLicenseResetAttempts,
  createLicenseResetToken,
  logLicenseResetEvent
} from "@/lib/customer-db";
import { sendLicenseResetCodeEmail } from "@/lib/email";
import { siteConfig } from "@/lib/site";

type ResetLicenseBody = {
  action?: "request" | "verify";
  email?: string;
  licenseKey?: string;
  code?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LICENSE_KEY_PATTERN = /^GGI-[A-Z0-9-]{8,25}$/;
const VERIFICATION_CODE_PATTERN = /^[A-Z0-9]{6}$/;
const RESET_CODE_EXPIRATION_MINUTES = 15;
const RESET_RATE_LIMIT_MESSAGE = `Contact ${siteConfig.supportEmail}`;
const SAFE_REQUEST_MESSAGE = "If the details are correct, a verification code has been sent.";

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function normalizeLicenseKey(licenseKey?: string | null) {
  return licenseKey?.trim().toUpperCase() ?? "";
}

function normalizeVerificationCode(code?: string | null) {
  return code?.trim().toUpperCase() ?? "";
}

function hashVerificationCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function generateVerificationCode() {
  return crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ResetLicenseBody;
  const action = body.action;
  const customerEmail = normalizeEmail(body.email);
  const licenseKey = normalizeLicenseKey(body.licenseKey);
  const requestIp = getRequestIp(request);

  if (!EMAIL_PATTERN.test(customerEmail) || !LICENSE_KEY_PATTERN.test(licenseKey)) {
    return NextResponse.json(
      {
        success: false,
        message: "Enter a valid email and license key."
      },
      { status: 400 }
    );
  }

  const recentAttempts = await countRecentLicenseResetAttempts({
    customerEmail,
    requestIp,
    windowMinutes: 30
  });

  if (recentAttempts >= 5) {
    await logLicenseResetEvent({
      customerEmail,
      licenseKey,
      requestIp,
      action: action === "verify" ? "verify" : "request",
      status: "rate_limited",
      error: RESET_RATE_LIMIT_MESSAGE
    });

    return NextResponse.json(
      {
        success: false,
        message: RESET_RATE_LIMIT_MESSAGE
      },
      { status: 429 }
    );
  }

  if (action === "verify") {
    const verificationCode = normalizeVerificationCode(body.code);

    if (!VERIFICATION_CODE_PATTERN.test(verificationCode)) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter the 6-character verification code."
        },
        { status: 400 }
      );
    }

    const consumedToken = await consumeLicenseResetToken({
      customerEmail,
      licenseKey,
      verificationCodeHash: hashVerificationCode(verificationCode)
    });

    if (!consumedToken) {
      await logLicenseResetEvent({
        customerEmail,
        licenseKey,
        requestIp,
        action: "verify",
        status: "failed",
        error: "Invalid or expired verification code"
      });

      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired verification code."
        },
        { status: 400 }
      );
    }

    const resetResult = await clearLicenseMachineLocks({
      customerEmail,
      licenseKey
    });

    if (!resetResult) {
      await logLicenseResetEvent({
        customerEmail,
        licenseKey,
        requestIp,
        action: "verify",
        status: "failed",
        error: "Unable to reset device lock"
      });

      return NextResponse.json(
        {
          success: false,
          message: "Unable to reset this license right now."
        },
        { status: 400 }
      );
    }

    await logLicenseResetEvent({
      licenseId: resetResult.license.id,
      customerEmail,
      licenseKey,
      requestIp,
      action: "verify",
      status: "consumed"
    });

    return NextResponse.json({
      success: true,
      message: "Device lock reset complete. You can activate this license on a new device now."
    });
  }

  const verificationCode = generateVerificationCode();
  const expiresAt = new Date(
    Date.now() + RESET_CODE_EXPIRATION_MINUTES * 60 * 1000
  ).toISOString();

  const tokenResult = await createLicenseResetToken({
    customerEmail,
    licenseKey,
    verificationCodeHash: hashVerificationCode(verificationCode),
    requestIp,
    expiresAt
  });

  if (!tokenResult) {
    await logLicenseResetEvent({
      customerEmail,
      licenseKey,
      requestIp,
      action: "request",
      status: "failed",
      error: "License ownership could not be verified"
    });

    return NextResponse.json({
      success: true,
      message: SAFE_REQUEST_MESSAGE
    });
  }

  if (tokenResult.blocked) {
    await logLicenseResetEvent({
      licenseId: tokenResult.license.id,
      customerEmail,
      licenseKey,
      requestIp,
      action: "request",
      status: "reset_limit_reached",
      error: RESET_RATE_LIMIT_MESSAGE
    });

    return NextResponse.json(
      {
        success: false,
        message: RESET_RATE_LIMIT_MESSAGE
      },
      { status: 400 }
    );
  }

  try {
    const emailResult = await sendLicenseResetCodeEmail({
      customerEmail,
      licenseKey,
      verificationCode,
      expiresInMinutes: RESET_CODE_EXPIRATION_MINUTES
    });

    console.log("License reset email sent", {
      customerEmail,
      to: customerEmail,
      from: emailResult.from,
      replyTo: emailResult.replyTo,
      resendMessageId: emailResult.id
    });

    await logLicenseResetEvent({
      licenseId: tokenResult.license.id,
      customerEmail,
      licenseKey,
      requestIp,
      action: "request",
      status: "sent"
    });

    return NextResponse.json({
      success: true,
      message: SAFE_REQUEST_MESSAGE
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("License reset email failed", {
      customerEmail,
      resendError: errorMessage
    });

    await logLicenseResetEvent({
      licenseId: tokenResult.license.id,
      customerEmail,
      licenseKey,
      requestIp,
      action: "request",
      status: "failed",
      error: errorMessage
    });

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong. Please try again."
      },
      { status: 500 }
    );
  }
}
