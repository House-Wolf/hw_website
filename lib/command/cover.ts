import "server-only";
import sharp from "sharp";
import { CommandError } from "./access.js";
/** Decode, limit pixels, and re-encode. No remote fetches, SVG, MIME trust or metadata retention. */
export async function normalizeEventCover(value: unknown) {
  if (typeof value !== "string" || value.length > 750000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) throw new CommandError(422, "INVALID_COVER", "Choose a PNG, JPEG or WebP image under 500 KB.");
  try {
    const source = Buffer.from(value.split(",")[1], "base64");
    const image = sharp(source, { limitInputPixels: 16000000, animated: false });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format || "") || (metadata.pages || 1) > 1) throw new Error("Invalid image");
    const jpeg = await image.rotate().resize(1280, 720, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    if (jpeg.length > 500000) throw new Error("Image too large");
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch { throw new CommandError(422, "INVALID_COVER", "The image could not be safely decoded. Choose a smaller PNG, JPEG or WebP."); }
}
