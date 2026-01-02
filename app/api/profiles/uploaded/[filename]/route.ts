import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { join, extname } from "path";

const STORAGE_ROOT = join(process.cwd(), "uploads", "profiles");

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  // Profile images are publicly accessible (used on public division pages)
  // No authentication required

  const { filename } = await params;
  if (!filename || filename.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
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
