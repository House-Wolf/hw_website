import { CommandError } from "./access.js";
import { operationBriefingUrl } from "./commitmentComponents.js";
import { aarFooter, aarSections, validAarBanner } from "./aarPresentation.js";

export async function queueAar(tx, op, report, actorId, reviewRevision, reconcile = false) {
  const existing = await tx.commandAarDelivery.findUnique({ where: { operationId: op.id } });
  const sameReview = existing?.reviewedAt.getTime() === report.reviewedAt.getTime();
  if (sameReview && ["PENDING", "PROCESSING", "POSTED"].includes(existing.status)) return;
  if (!reconcile && sameReview && existing?.sendingAt && !existing.messageId) throw new CommandError(409, "AAR_AMBIGUOUS", "Check the AAR channel before retrying an uncertain post. Its delivery must be reconciled first.");
  const data = { reviewRevision: sameReview ? existing.reviewRevision : reviewRevision, reviewedAt: report.reviewedAt, actorId, status: op.input.visibility === "GUILD" ? "PENDING" : "BLOCKED", errorCode: op.input.visibility === "GUILD" ? null : "PRIVATE_REPORT", attempts: 0, availableAt: new Date(), leaseUntil: null, leaseToken: null };
  await tx.commandAarDelivery.upsert({ where: { operationId: op.id }, create: { operationId: op.id, ...data }, update: data });
}

export function aarMessage({ operationId, title, summary, reviewRevision, baseUrl, bannerUrl = null, attendance = null }) {
  const url = operationBriefingUrl(operationId, baseUrl);
  const section = aarSections({ title, summary });
  const link = section.truncated ? "Read the full approved report" : "View operation & full report";
  const description = `**After-action report**\n${section.summary}\n\n[${link}](${url})`;
  const fields = attendance ? [
    { name: "Present", value: String(attendance.present), inline: true },
    { name: "Absent", value: String(attendance.absent), inline: true },
    { name: "Excused", value: String(attendance.excused), inline: true },
  ] : [];
  fields.push({ name: "Approved version", value: String(reviewRevision), inline: true });
  const report = { title: section.title, description, url, color: 0xb4444e,
    author: { name: "House Wolf \u00b7 After-action report" }, footer: { text: aarFooter(operationId) }, fields };
  const banner = validAarBanner(bannerUrl) ? bannerUrl : null;
  const attached = banner?.startsWith("data:");
  return { embeds: [...(banner ? [{ color: 0xb4444e, image: { url: attached ? "attachment://operation-banner.jpg" : banner } }] : []), report],
    attachments: attached ? [{ id: 0, filename: "operation-banner.jpg" }] : [], allowed_mentions: { parse: [] } };
}
