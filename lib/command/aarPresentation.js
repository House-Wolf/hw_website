/** Public presentation fields only; never pass private officer or attendance notes. */
export function aarContext(op) {
  const input = op.input || {};
  let bannerUrl = null;
  if (input.imageBehavior !== "REMOVE") {
    if (/^\d{17,20}$/.test(op.nativeEventId || "") && /^(?:a_)?[a-f0-9]{32}$/.test(op.nativeSnapshot?.image || "")) bannerUrl = `https://cdn.discordapp.com/guild-events/${op.nativeEventId}/${op.nativeSnapshot.image}.png?size=1024`;
    else if (typeof input.imageData === "string" && input.imageData.length <= 750000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(input.imageData)) bannerUrl = input.imageData;
  }
  return { title: input.title || "Operation", bannerUrl, visibility: input.visibility };
}

export function aarSections({ title = "Operation", summary = "" }) {
  const safe = value => String(value).replace(/@/g, "@\u200b");
  const clip = (value, limit) => value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
  const report = safe(summary).trim();
  const limit = 3500;
  return { title: clip(safe(title), 256), summary: clip(report, limit), truncated: report.length > limit };
}

export const aarFooter = operationId => `House Wolf AAR \u00b7 ${operationId}`;

export function validAarBanner(value) {
  return typeof value === "string" && (/^https:\/\/cdn\.discordapp\.com\/guild-events\/\d{17,20}\/(?:a_)?[a-f0-9]{32}\.png\?size=1024$/.test(value) || (value.length <= 750000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value)));
}
