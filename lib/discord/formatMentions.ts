/**
 * @component normalizeDiscordMentions - Utility to convert Discord mentions to readable labels
 * @description Converts Discord-style mentions in text to human-readable labels.
 * Currently maps role mentions to predefined labels.
 * @author House Wolf Dev Team
 */
const ROLE_LABELS: Record<string, string> = {
  "1319052362261725214": "@Member",

};

/**
 * @function normalizeDiscordMentions
 * @description Replaces Discord mentions in the input text with human-readable labels.
 * @param text - The input text containing Discord mentions.
 * @returns The text with mentions replaced by labels.
 * @author House Wolf Dev Team
 */
export function normalizeDiscordMentions(text: string): string {
  if (!text) return text;

  return text
    .replace(/<@&(\d+)>/g, (_, id: string) => ROLE_LABELS[id] ?? "@Member")
    .replace(/<@!?(\d+)>/g, "@Member");
}
