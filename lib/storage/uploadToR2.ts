import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "./r2Client";
import crypto from "crypto";

export async function uploadToR2(
  file: Buffer,
  contentType: string,
  folder = "uploads"
) {
  const ext = contentType.split("/")[1] ?? "png";
  const key = `${folder}/${crypto.randomUUID()}.${ext}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
