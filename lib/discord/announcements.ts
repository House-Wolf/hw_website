import { normalizeDiscordMentions } from "./formatMentions";

export interface AnnouncementMessage {
  id: string;
  content: string;
  timestamp: string;
  embeds?: Array<{
    type?: string;
    url?: string;
    provider?: { name?: string; url?: string };
    title?: string;
    description?: string;
    fields?: Array<{ name: string; value: string }>;
    image?: { url: string };
    thumbnail?: { url: string };
  }>;
  attachments?: Array<{ url: string; filename: string; content_type?: string }>;
}

export interface HomepageAnnouncement {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  timestamp: string;
  imageUrl: string | null;
}

function isGif(url: string) {
  try {
    const { hostname, pathname } = new URL(url);
    return /(^|\.)(tenor\.com|giphy\.com)$/i.test(hostname) || /\.gif$/i.test(pathname);
  } catch {
    return false;
  }
}

function safeStillImage(url?: string) {
  if (!url || isGif(url)) return null;
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function plainText(text: string) {
  return text.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~#|]/g, "").replace(/\s+/g, " ").trim();
}

/** Keep authored news, without promoting automatic GIF previews into news items. */
export function prepareAnnouncements(messages: AnnouncementMessage[], now = Date.now()): HomepageAnnouncement[] {
  return messages.flatMap((message): HomepageAnnouncement[] => {
    const richEmbeds = (message.embeds ?? []).filter((embed) =>
      (!embed.type || embed.type === "rich") &&
      !/tenor|giphy/i.test(embed.provider?.name ?? "") && !isGif(embed.url ?? "")
    );
    const stillAttachment = message.attachments?.find((attachment) =>
      (attachment.content_type?.startsWith("image/") || /\.(png|jpe?g|webp)(?:\?|$)/i.test(attachment.filename)) &&
      attachment.content_type !== "image/gif" && !/\.gif$/i.test(attachment.filename) && safeStillImage(attachment.url)
    );
    const embedImage = richEmbeds.flatMap((embed) => [embed.image?.url, embed.thumbnail?.url])
      .map(safeStillImage).find(Boolean);
    let imageUrl = safeStillImage(stillAttachment?.url) ?? embedImage ?? null;

    const cleanText = (text: string) => normalizeDiscordMentions(text)
      // Remove GIF links (including Markdown labels) and promote still-image links to thumbnails.
      .replace(/!?\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/gi, (match, url: string) => {
        if (isGif(url)) return "";
        if (/\.(png|jpe?g|webp)(?:\?|$)/i.test(url) && safeStillImage(url)) {
          imageUrl ??= url;
          return "";
        }
        return match;
      })
      .replace(/https?:\/\/[^\s<>]+/gi, (url) => {
        if (isGif(url)) return "";
        if (/\.(png|jpe?g|webp)(?:\?|$)/i.test(url) && safeStillImage(url)) {
          imageUrl ??= url;
          return "";
        }
        return url;
      })
      .split("\n")
      // Discord ping-only/spoiler lines aren't useful announcement headings.
      .filter((line) => !/^(?:\s|[|*_~]|@Member|@Role|#channel|@everyone|@here)+$/i.test(line))
      .join("\n").replace(/\n{3,}/g, "\n\n").trim();

    const sections = [message.content, ...richEmbeds.map((embed) =>
      [embed.title, embed.description, ...(embed.fields ?? []).map((field) => `**${field.name}**\n${field.value}`)]
        .filter(Boolean).join("\n\n")
    )].map(cleanText).filter(Boolean);
    const text = [...new Set(sections)].join("\n\n");
    if (!text && !imageUrl) return [];

    const lines = text.split("\n");
    const firstLine = plainText(lines[0] ?? "");
    const hasHeading = firstLine.length > 0 && firstLine.length <= 100 && lines.length > 1;
    const title = hasHeading ? firstLine : text ? "From House Wolf" : "Community photo";
    const content = hasHeading ? lines.slice(1).join("\n").trim() : text;
    const preview = plainText(content);
    const excerpt = preview.length > 180 ? `${preview.slice(0, 177).replace(/\s+\S*$/, "")}…` : preview;
    const elapsedHours = Math.max(0, Math.floor((now - Date.parse(message.timestamp)) / 3_600_000));
    const days = Math.floor(elapsedHours / 24);
    const timestamp = days > 0 ? `${days} day${days === 1 ? "" : "s"} ago`
      : elapsedHours > 0 ? `${elapsedHours} hour${elapsedHours === 1 ? "" : "s"} ago` : "Just now";
    return [{ id: message.id, title, content, excerpt, timestamp, imageUrl }];
  }).slice(0, 3);
}
