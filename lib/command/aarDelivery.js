import { CommandError } from "./access.js";
import { operationBriefingUrl } from "./commitmentComponents.js";

export async function queueAar(tx, op, report, actorId, reviewRevision, reconcile = false) {
  const existing = await tx.commandAarDelivery.findUnique({ where: { operationId: op.id } });
  const sameReview = existing?.reviewedAt.getTime() === report.reviewedAt.getTime();
  if (sameReview && ["PENDING", "PROCESSING", "POSTED"].includes(existing.status)) return;
  if (!reconcile && sameReview && existing?.sendingAt && !existing.messageId) throw new CommandError(409, "AAR_AMBIGUOUS", "Check the AAR channel before retrying an uncertain post. Its delivery must be reconciled first.");
  const data = { reviewRevision: sameReview ? existing.reviewRevision : reviewRevision, reviewedAt: report.reviewedAt, actorId, status: op.input.visibility === "GUILD" ? "PENDING" : "BLOCKED", errorCode: op.input.visibility === "GUILD" ? null : "PRIVATE_REPORT", attempts: 0, availableAt: new Date(), leaseUntil: null, leaseToken: null };
  await tx.commandAarDelivery.upsert({ where: { operationId: op.id }, create: { operationId: op.id, ...data }, update: data });
}

export function aarMessage({ operationId, title, summary, reviewRevision, baseUrl }) {
  const url = operationBriefingUrl(operationId, baseUrl);
  const safe = value => value.replace(/@/g, "@\u200b");
  const excerpt = summary.length > 3800 ? `${summary.slice(0, 3800)}\n\n[Read the full approved report](${url})` : summary;
  return { embeds: [{ title: `After-action report: ${safe(title)}`.slice(0, 256), description: safe(excerpt), url, color: 0x114e62,
    footer: { text: `House Wolf AAR · ${operationId}` }, fields: [{ name: "Approved version", value: String(reviewRevision), inline: true }] }], allowed_mentions: { parse: [] } };
}
