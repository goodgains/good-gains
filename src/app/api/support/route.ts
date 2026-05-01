import { NextResponse } from "next/server";
import { sendSupportMessageEmail } from "@/lib/email";

type SupportBody = {
  name?: string;
  email?: string;
  topic?: string;
  message?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SupportBody;
    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const topic = body.topic?.trim() ?? "";
    const message = body.message?.trim() ?? "";

    if (!name || !email || !topic || !message) {
      return NextResponse.json(
        { success: false, message: "Please complete all support form fields." },
        { status: 400 }
      );
    }

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    console.log("Support form email send attempt", {
      customerEmail: email,
      topic
    });

    const emailResult = await sendSupportMessageEmail({
      name,
      email,
      topic,
      message
    });

    console.log("Support form email sent successfully", {
      customerEmail: email,
      to: emailResult.to,
      from: emailResult.from,
      replyTo: emailResult.replyTo,
      provider: "resend",
      mode: emailResult.mode,
      messageId: emailResult.id,
      status: emailResult.status,
      providerResponse: emailResult.providerResponse
    });

    return NextResponse.json({
      success: true,
      message: "Your message has been sent. We'll get back to you soon.",
      emailDelivery: {
        sent: true,
        provider: "resend",
        mode: emailResult.mode,
        to: emailResult.to,
        from: emailResult.from,
        replyTo: emailResult.replyTo,
        messageId: emailResult.id
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("Support form email failed", {
      error: errorMessage
    });

    return NextResponse.json(
      {
        success: false,
        message: "Unable to send your message right now. Please try again or email support directly.",
        emailDelivery: {
          sent: false,
          provider: "resend",
          error: errorMessage
        }
      },
      { status: 500 }
    );
  }
}
