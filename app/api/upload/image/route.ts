export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/lib/storage/r2Client";

export async function POST(req: Request) {
  try {
    const contentType = (req.headers.get("content-type") || "").toLowerCase();
    if (!contentType.startsWith("multipart/form-data")) {
      return NextResponse.json(
        { error: "Use multipart/form-data with a file field named 'file'." },
        { status: 415 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type.split("/")[1] ?? "png";
    const key = `profiles/${randomUUID()}.${ext}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("❌ Image upload failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
