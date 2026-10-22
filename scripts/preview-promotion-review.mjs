import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { promotionReviewMessage } from "../bot/personnelMessages.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";

const outputDirectory = fileURLToPath(new URL("../artifacts/previews/", import.meta.url));
const logoPath = fileURLToPath(new URL("../public/images/global/HWiconnew.png", import.meta.url));
const canvasWidth = 780;
const cardWidth = 560;
const cardLeft = 84;
const inset = 18;
const layers = [];
const fontfile = "C:/Windows/Fonts/segoeui.ttf";
const dateFormat = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "America/New_York" });

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]);
}

function markdown(value) {
  const dates = value.replace(/<t:(\d+):D>/g, (_, timestamp) => dateFormat.format(new Date(Number(timestamp) * 1000)));
  return escapeXml(dates).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/&lt;@PREVIEW&gt;/g, '<span foreground="#dfe0ff" background="#414675"> @Nightmare_Wolf </span>');
}

async function textLayer(text, left, top, width, size = 15, color = "#dbdee1") {
  const result = await sharp({ text: { text: `<span foreground="${color}">${text}</span>`, font: `Segoe UI ${size}`, fontfile, width, rgba: true, spacing: 4 } }).png().toBuffer({ resolveWithObject: true });
  layers.push({ input: result.data, left, top });
  return result.info.height;
}

const request = {
  id: "PREVIEW-ONLY", sourceRankRoleId: PERSONNEL_ROLES.platoonSergeant, targetRankRoleId: PERSONNEL_ROLES.fieldMarshal,
  rankSince: new Date("2024-10-22T12:00:00Z"), eligibleAt: new Date("2026-10-22T12:00:00Z"),
  createdAt: new Date("2026-10-22T12:00:00Z"), approvalsRequired: 3, status: "REVIEW",
  votes: [
    { voterDiscordId: "sample-officer-one", decision: "APPROVE", isVeto: false },
    { voterDiscordId: "sample-officer-two", decision: "APPROVE", isVeto: false },
    { voterDiscordId: "sample-officer-three", decision: "REJECT", isVeto: false },
  ],
};
const payload = promotionReviewMessage(request, { id: "PREVIEW", displayName: "Nightmare Wolf", user: { displayAvatarURL: () => "https://cdn.discordapp.com/preview.png" } });
const embed = payload.embeds[0];
await textLayer("<b>HouseWolf-MP</b>", cardLeft, 84, 150, 16, "#f2f3f5");
await textLayer("APP", cardLeft + 130, 90, 35, 10, "#ffffff");
await textLayer("Today at 08:00", cardLeft + 172, 88, 180, 11, "#949ba4");

const embedTop = 118;
let cursor = embedTop + 18;
cursor += await textLayer(`<b>${escapeXml(embed.author.name)}</b>`, cardLeft + inset, cursor, cardWidth - 112, 12, "#b5bac1");
cursor += 12;
cursor += await textLayer(`<b>${escapeXml(embed.title)}</b>`, cardLeft + inset, cursor, cardWidth - 112, 17, "#f2f3f5");
cursor += 16;
cursor += await textLayer(markdown(embed.description), cardLeft + inset, cursor, cardWidth - inset * 2);
cursor += 24;

const columnWidth = 166;
let rowHeight = 0;
for (const [index, field] of embed.fields.filter((field) => field.inline).entries()) {
  const left = cardLeft + inset + index * (columnWidth + 9);
  let height = await textLayer(`<b>${escapeXml(field.name)}</b>`, left, cursor, columnWidth, 13, "#f2f3f5");
  height += 8;
  height += await textLayer(markdown(field.value), left, cursor + height, columnWidth, 14);
  rowHeight = Math.max(rowHeight, height);
}
cursor += rowHeight;

for (const field of embed.fields.filter((field) => !field.inline)) {
  cursor += 24;
  cursor += await textLayer(`<b>${escapeXml(field.name)}</b>`, cardLeft + inset, cursor, cardWidth - inset * 2, 13, "#f2f3f5");
  cursor += 8;
  cursor += await textLayer(markdown(field.value), cardLeft + inset, cursor, cardWidth - inset * 2);
}
cursor += 25;
cursor += await textLayer(escapeXml(`${embed.footer.text} • Today at 08:00`), cardLeft + inset, cursor, cardWidth - inset * 2, 11, "#949ba4");
cursor += 19;
const embedHeight = cursor - embedTop;
const buttonTop = cursor + 9;
const buttonWidths = [206, 222];
let buttonLeft = cardLeft;
const buttonShapes = [];
for (const [index, button] of payload.components[0].components.entries()) {
  const width = buttonWidths[index];
  buttonShapes.push(`<rect x="${buttonLeft}" y="${buttonTop}" width="${width}" height="36" rx="4" fill="${button.style === 3 ? "#248046" : "#da373c"}"/>`);
  await textLayer(`<b>${escapeXml(button.label)}</b>`, buttonLeft + 15, buttonTop + 10, width - 26, 14, "#ffffff");
  buttonLeft += width + 8;
}
const totalHeight = buttonTop + 36 + 38;
const chrome = Buffer.from(`<svg width="${canvasWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${canvasWidth}" height="${totalHeight}" fill="#313338"/>
  <path d="M0 55H${canvasWidth}" stroke="#202225"/>
  <rect x="${cardLeft + 126}" y="87" width="34" height="16" rx="3" fill="#5865f2"/>
  <circle cx="44" cy="105" r="22" fill="#202225"/>
  <rect x="${cardLeft}" y="${embedTop}" width="${cardWidth}" height="${embedHeight}" rx="4" fill="#2b2d31"/>
  <path d="M${cardLeft + 2} ${embedTop + 3}V${embedTop + embedHeight - 3}" stroke="#114e62" stroke-width="4"/>
  ${buttonShapes.join("\n")}
</svg>`);

layers.push({ input: await sharp(logoPath).resize(38, 38, { fit: "contain" }).png().toBuffer(), left: 25, top: 86 });
layers.push({ input: await sharp(logoPath).resize(62, 62, { fit: "contain" }).png().toBuffer(), left: cardLeft + cardWidth - 82, top: embedTop + 17 });
await textLayer("#", 25, 15, 30, 23, "#949ba4");
await textLayer("<b>officer-chat</b>", 56, 17, 220, 16, "#f2f3f5");
await textLayer("House Wolf", 615, 20, 130, 12, "#949ba4");

await mkdir(outputDirectory, { recursive: true });
const output = `${outputDirectory}promotion-review-discord-preview.png`;
await writeFile(output, await sharp(chrome).composite(layers).png().toBuffer());
console.log(output);
