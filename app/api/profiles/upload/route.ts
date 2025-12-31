import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { rateLimit, RATE_LIMITS, getRateLimitIdentifier, getClientIp, createRateLimitHeaders } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];

export async function POST(req: NextRequest) {
  try {
    // 1) Require authentication
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Rate limiting for uploads
    const identifier = getRateLimitIdentifier(
      session.user.id,
      getClientIp(req.headers)
    );
    const rateLimitResult = await rateLimit(identifier, RATE_LIMITS.UPLOAD);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many upload requests. Please try again later." },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Prefer a stable user identifier for the filename
    const userId = session.user.id ?? session.user.email ?? "unknown";
    const safeUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, "");

    // 2) Parse form data & get file
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 3) Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, JPG, GIF, WEBP." },
        { status: 400 }
      );
    }

    // 4) Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Max size is 5 MB." },
        { status: 400 }
      );
    }

    // 5) Read file into Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 6) Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads", "profiles");
    await mkdir(uploadDir, { recursive: true });

    // 7) Resize & convert to WEBP 400x400 (cover crop)
    const resizedBuffer = await sharp(buffer)
      .resize(400, 400, {
        fit: "cover",
        position: "center",
      })
      .toFormat("webp")
      .toBuffer();

    // 8) Secure filename: profile-<userId>-<timestamp>.webp
    const timestamp = Date.now();
    const filename = `profile-${safeUserId}-${timestamp}.webp`;
    const filePath = path.join(uploadDir, filename);

    // 9) Write file to disk
    await writeFile(filePath, resizedBuffer);

    // 10) Public URL usable by <img> or Next/Image
    const publicUrl = `/uploads/profiles/${filename}`;

    return NextResponse.json({ url: publicUrl }, { status: 200 });
  } catch (error) {
    console.error("Profile upload failed:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
