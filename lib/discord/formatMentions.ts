/** Only caller-supplied, already-public names may be resolved here. Never fetch per mention. */
const ROLE_LABELS: Record<string, string> = { "1319052362261725214": "Member" };
type PublicLabels = { users?: Record<string, string>; roles?: Record<string, string>; channels?: Record<string, string> };
const safeLabel = (value: string) => value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 80).replace(/[\\`*_[\]<>#!|]/g, "\\$&");

export function normalizeDiscordMentions(text: string, labels: PublicLabels = {}): string {
  if (!text) return text;
  return text
    .replace(/<@&(\d+)>/g, (_, id: string) => "@" + safeLabel(labels.roles?.[id] || ROLE_LABELS[id] || "Role"))
    .replace(/<@!?(\d+)>/g, (_, id: string) => "@" + safeLabel(labels.users?.[id] || "Member"))
    .replace(/<#(\d+)>/g, (_, id: string) => "#" + safeLabel(labels.channels?.[id] || "channel"));
}

/** Public previews conceal spoiler content rather than exposing it as ordinary text. */
export function formatDiscordMarkdown(text: string, labels: PublicLabels = {}): string {
  return normalizeDiscordMentions(text, labels)
    .replace(/(?<!\\)\|\|[\s\S]*?(?<!\\)\|\|/g, "[Spoiler hidden]")
    .replace(/^-#\s+(.+)$/gm, "> $1");
}
