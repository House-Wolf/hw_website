import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { rateLimit, RATE_LIMITS, getRateLimitIdentifier, getClientIp, createRateLimitHeaders } from "@/lib/rate-limit";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/lib/storage/r2Client";
import crypto from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB (increased for better quality)
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];

export async function POST(req: NextRequest) {
  try {
    console.log("[Profile Upload] Starting upload process");

    // 1) Require authentication
    const session = await auth();

    if (!session?.user) {
      console.error("[Profile Upload] Unauthorized - no session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[Profile Upload] User authenticated: ${session.user.id}`);

    // 2) Rate limiting for uploads
    const identifier = getRateLimitIdentifier(
      session.user.id,
      getClientIp(req.headers)
    );
    const rateLimitResult = await rateLimit(identifier, RATE_LIMITS.UPLOAD);

    if (!rateLimitResult.success) {
      console.error("[Profile Upload] Rate limit exceeded");
      return NextResponse.json(
        { error: "Too many upload requests. Please try again later." },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // 3) Parse form data & get file
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      console.error("[Profile Upload] No file in request");
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    console.log(`[Profile Upload] File received: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);

    // 4) Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      console.error(`[Profile Upload] Invalid file type: ${file.type}`);
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, JPG, GIF, WEBP." },
        { status: 400 }
      );
    }

    // 5) Validate file size
    if (file.size > MAX_FILE_SIZE) {
      console.error(`[Profile Upload] File too large: ${file.size} bytes`);
      return NextResponse.json(
        { error: "File too large. Max size is 10 MB." },
        { status: 400 }
      );
    }

    // 6) Read file into Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log(`[Profile Upload] Buffer created: ${buffer.length} bytes`);

    // 7) Resize & convert to WEBP 400x400 (cover crop)
    console.log("[Profile Upload] Processing image with Sharp");
    const resizedBuffer = await sharp(buffer)
      .resize(400, 400, {
        fit: "cover",
        position: "center",
      })
      .toFormat("webp", { quality: 85 })
      .toBuffer();

    console.log(`[Profile Upload] Image processed: ${resizedBuffer.length} bytes`);

    // 8) Generate unique filename for R2
    const key = `portraits/profile-${crypto.randomUUID()}.webp`;
    console.log(`[Profile Upload] Uploading to R2 bucket: ${process.env.R2_BUCKET}, key: ${key}`);

    // 9) Upload to R2
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        Body: resizedBuffer,
        ContentType: "image/webp",
      })
    );

    // 10) Construct public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    console.log(`[Profile Upload] Upload successful: ${publicUrl}`);

    return NextResponse.json({ url: publicUrl }, { status: 200 });
  } catch (error) {
    console.error("[Profile Upload] Upload failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
