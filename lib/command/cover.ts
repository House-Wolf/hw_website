import "server-only";
import sharp from "sharp";
import { CommandError } from "./access.js";
/** Decode, limit pixels, and re-encode. No remote fetches, SVG, MIME trust or metadata retention. */
export async function normalizeEventCover(value: unknown) {
  if (typeof value !== "string" || value.length > 750000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) throw new CommandError(422, "INVALID_COVER", "Choose a PNG, JPEG or WebP image under 500 KB.");
  return normalizeEventCoverBytes(Buffer.from(value.split(",")[1], "base64"));
}

export async function normalizeEventCoverBytes(source: Buffer) {
  if (!source.length || source.length > 4 * 1024 * 1024) throw new CommandError(422, "INVALID_COVER", "Choose an image up to 4 MB.");
  const jpeg = source.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  const png = source.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = source.subarray(0, 4).toString("ascii") === "RIFF" && source.subarray(8, 12).toString("ascii") === "WEBP";
  if (!jpeg && !png && !webp) throw new CommandError(422, "INVALID_COVER", "Choose a PNG, JPEG or WebP image.");
  try {
    const image = sharp(source, { limitInputPixels: 16000000, animated: false });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format || "") || (metadata.pages || 1) > 1) throw new Error("Invalid image");
    const resized = image.rotate().resize(1280, 720, { fit: "inside", withoutEnlargement: true });
    for (const quality of [80, 68, 55, 42]) {
      const output = await resized.clone().jpeg({ quality }).toBuffer();
      if (output.length <= 500000) return `data:image/jpeg;base64,${output.toString("base64")}`;
    }
    throw new Error("Image too large");
  } catch { throw new CommandError(422, "INVALID_COVER", "Choose a valid PNG, JPEG or WebP up to 4 MB and 16 megapixels. The image could not be safely processed."); }
}
