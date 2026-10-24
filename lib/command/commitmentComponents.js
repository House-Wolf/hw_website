import { CommandError } from "./access.js";
export function operationBriefingUrl(id, baseUrl) {
  try {
    const url = new URL(`/dashboard/operations/${id}`, baseUrl);
    if (url.username || url.password || !(url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) throw new Error("Invalid website URL");
    return url.href;
  } catch {
    throw new CommandError(503, "WEBSITE_UNCONFIGURED", "Configure the canonical website URL before posting operation messages.");
  }
}
export function commitmentComponents(op, baseUrl) {
  if (op.input.visibility !== "GUILD" || !["PUBLISHED", "ACTIVE"].includes(op.state)) return [];
  const url = operationBriefingUrl(op.id, baseUrl);
  return [{ type: 1, components: [
    ...[["COMMITTED", "Commit", 3], ["TENTATIVE", "Tentative", 2], ["RESERVE", "Reserve", 2], ["WITHDRAWN", "Withdraw", 4]].map(([status, label, style]) => ({ type: 2, style, label, custom_id: `hwop:${op.id}:${op.revision}:${status}` })),
    { type: 2, style: 5, label: "View briefing", url },
  ] }];
}
