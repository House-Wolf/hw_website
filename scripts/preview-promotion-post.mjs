import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { promotionAnnouncement } from "../bot/personnelMessages.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";

const outputDirectory = fileURLToPath(new URL("../artifacts/previews/", import.meta.url));
const logoPath = fileURLToPath(new URL("../public/images/global/HWiconnew.png", import.meta.url));
const fontfile = "C:/Windows/Fonts/segoeui.ttf";
const canvasWidth = 780;
const cardWidth = 560;
const cardLeft = 84;
const inset = 18;
const layers = [];
let cursor = 84;

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]);
}

function markdown(value) {
  return escapeXml(value).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/&lt;@PREVIEW&gt;/g, '<span foreground="#dfe0ff" background="#414675"> @Nightmare_Wolf </span>');
}

async function textLayer(text, left, top, width, size = 16, color = "#dbdee1") {
  const result = await sharp({ text: { text: `<span foreground="${color}">${text}</span>`, font: `Segoe UI ${size}`, fontfile, width, rgba: true, spacing: 4 } }).png().toBuffer({ resolveWithObject: true });
  layers.push({ input: result.data, left, top });
  return result.info.height;
}

const payload = await promotionAnnouncement({
  id: "PREVIEW-ONLY", sourceRankRoleId: PERSONNEL_ROLES.platoonSergeant,
  targetRankRoleId: PERSONNEL_ROLES.fieldMarshal, completedAt: new Date("2026-10-17T12:00:00Z"),
}, { id: "PREVIEW", displayName: "Nightmare Wolf", user: { displayAvatarURL() { throw new Error("Use the House Wolf emblem for this preview"); } } });

await textLayer("<b>HouseWolf-MP</b>", cardLeft, cursor, 150, 16, "#f2f3f5");
await textLayer("APP", cardLeft + 130, cursor + 3, 35, 10, "#ffffff");
await textLayer("17/10/2026 12:00", cardLeft + 172, cursor + 4, 180, 11, "#949ba4");
cursor += 29;
cursor += await textLayer(markdown(payload.components[0].content), cardLeft, cursor, 620);
cursor += 13;

const bannerTop = cursor;
const banner = await sharp(payload.files[0].attachment).resize(cardWidth - inset * 2).png().toBuffer({ resolveWithObject: true });
layers.push({ input: banner.data, left: cardLeft + inset, top: bannerTop + inset });
const bannerHeight = banner.info.height + inset * 2;
cursor += bannerHeight + 8;

cursor += 17;
const card = payload.components[1];
for (const component of card.components.slice(1)) {
  // This is an illustrative preview; Discord controls actual component rendering.
  const content = component.content.replace(/^### /gm, "").replace(/^-# /gm, "");
  cursor += await textLayer(markdown(content), cardLeft + inset, cursor, cardWidth - inset * 2, 15);
  cursor += 16;
}
cursor += 19;
const totalHeight = cursor + 40;

const chrome = Buffer.from(`<svg width="${canvasWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${canvasWidth}" height="${totalHeight}" fill="#313338"/>
  <rect width="${canvasWidth}" height="55" fill="#313338"/>
  <path d="M0 55H${canvasWidth}" stroke="#202225"/>
  <rect x="${cardLeft + 126}" y="87" width="34" height="16" rx="3" fill="#5865f2"/>
  <circle cx="44" cy="105" r="22" fill="#202225"/>
  <rect x="${cardLeft}" y="${bannerTop}" width="${cardWidth}" height="${cursor - bannerTop}" rx="4" fill="#2b2d31"/>
  <path d="M${cardLeft + 2} ${bannerTop + 3}V${cursor - 3}" stroke="#114e62" stroke-width="4"/>
</svg>`);

const logo = await sharp(logoPath).resize(38, 38, { fit: "contain" }).png().toBuffer();
layers.push({ input: logo, left: 25, top: 86 });
await textLayer("#", 25, 15, 30, 23, "#949ba4");
await textLayer("<b>announcements</b>", 56, 17, 220, 16, "#f2f3f5");
await textLayer("House Wolf", 615, 20, 130, 12, "#949ba4");

await mkdir(outputDirectory, { recursive: true });
const output = `${outputDirectory}field-marshal-discord-preview.png`;
await writeFile(output, await sharp(chrome).composite(layers).png().toBuffer());
console.log(output);
