import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { join, extname } from "path";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { Readable } from "stream";

const STORAGE_ROOT = join(process.cwd(), "uploads", "marketplace"); // outside /public
const SIGNING_SECRET =
  process.env.FILE_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function isValidSignature(filename: string, exp: number, sig: string | null) {
  if (!SIGNING_SECRET || !sig || !Number.isFinite(exp)) return false;
  const expected = crypto
    .createHmac("sha256", SIGNING_SECRET)
    .update(`${filename}:${exp}`)
    .digest("hex");
  const provided = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (provided.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(provided, expectedBuf);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!SIGNING_SECRET) {
    return NextResponse.json(
      { error: "Server misconfigured: FILE_TOKEN_SECRET missing" },
      { status: 500 }
    );
  }

  const { filename } = await params;
  if (!filename || filename.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const exp = Number.parseInt(req.nextUrl.searchParams.get("exp") || "");
  const sig = req.nextUrl.searchParams.get("sig");

  if (!isValidSignature(filename, exp, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (exp < Date.now()) {
    return NextResponse.json({ error: "URL expired" }, { status: 410 });
  }

  const filepath = join(STORAGE_ROOT, filename);
  try {
    const stats = await stat(filepath);
    const stream = createReadStream(filepath);
    const contentType =
      CONTENT_TYPES[extname(filename).toLowerCase()] ||
      "application/octet-stream";

    return new NextResponse(stream as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": stats.size.toString(),
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error: unknown) {
    console.error("Error serving uploaded file:", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
