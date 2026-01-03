import { NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/storage/uploadToR2";

export async function POST(req: Request) {
  try {
    console.log("[Upload API] Received upload request");

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      console.error("[Upload API] No file provided");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log(`[Upload API] File received: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);

    // Validate file type
    if (!file.type.startsWith("image/")) {
      console.error(`[Upload API] Invalid file type: ${file.type}`);
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      console.error(`[Upload API] File too large: ${file.size} bytes`);
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    console.log(`[Upload API] Buffer created, size: ${buffer.length} bytes`);

    const url = await uploadToR2(buffer, file.type, "portraits");

    console.log(`[Upload API] Upload successful, returning URL: ${url}`);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[Upload API] Upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
