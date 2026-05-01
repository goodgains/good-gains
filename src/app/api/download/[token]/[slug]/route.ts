import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  DOWNLOAD_ACCESS_COOKIE,
  getValidatedDeliveryByToken,
  hasDownloadAccess,
  incrementDownloadCount
} from "@/lib/delivery";
import { getReleaseBySlug } from "@/lib/downloads";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string; slug: string }> }
) {
  const { token, slug } = await context.params;
  const record = await getValidatedDeliveryByToken(token);

  if (!record) {
    return NextResponse.json({ error: "This link is invalid or expired." }, { status: 404 });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const accessCookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${DOWNLOAD_ACCESS_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=") ?? null;

  if (!hasDownloadAccess(record, accessCookie ? decodeURIComponent(accessCookie) : null)) {
    return NextResponse.json({ error: "Email verification is required before downloading." }, { status: 403 });
  }

  if (slug === "bundle") {
    return NextResponse.json(
      { error: "Bundle purchases are delivered as separate product downloads." },
      { status: 404 }
    );
  }

  const hasAccess = record.purchasedSlugs.includes(slug);

  if (!hasAccess) {
    return NextResponse.json({ error: "This download is not included in the purchase." }, { status: 403 });
  }

  const release = getReleaseBySlug(slug);

  if (!release) {
    return NextResponse.json({ error: "Download release not found." }, { status: 404 });
  }

  const fileName = path.basename(release.filePath);
  const filePath = path.join(process.cwd(), "public", "downloads", fileName);

  try {
    const updatedRecord = await incrementDownloadCount(token);

    if (!updatedRecord) {
      return NextResponse.json({ error: "This link is invalid or expired." }, { status: 404 });
    }

    const file = await fs.readFile(filePath);

    return new NextResponse(file, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${release.fileName}"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch {
    return NextResponse.json({ error: "Download file is missing." }, { status: 404 });
  }
}
