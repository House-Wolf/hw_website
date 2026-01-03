import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "./r2Client";
import crypto from "crypto";

export async function uploadToR2(
  file: Buffer,
  contentType: string,
  folder = "uploads"
) {
  try {
    const ext = contentType.split("/")[1] ?? "png";
    const key = `${folder}/${crypto.randomUUID()}.${ext}`;

    console.log(`[R2] Uploading file to bucket: ${process.env.R2_BUCKET}, key: ${key}`);

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    await r2.send(command);

    const url = `${process.env.R2_PUBLIC_URL}/${key}`;
    console.log(`[R2] Upload successful, URL: ${url}`);

    return url;
  } catch (error) {
    console.error("[R2] Upload failed:", error);
    if (error instanceof Error) {
      throw new Error(`R2 upload failed: ${error.message}`);
    }
    throw new Error("R2 upload failed with unknown error");
  }
}
