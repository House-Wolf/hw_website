const DISCORD_API_BASE = "https://discord.com/api/v10";

interface DiscordMessage {
  id: string;
  content: string;
  timestamp: string;
  author: {
    username: string;
    avatar: string;
  };
  embeds?: Array<{
    title?: string;
    description?: string;
    image?: { url: string };
    thumbnail?: { url: string };
  }>;
  attachments?: Array<{
    url: string;
    filename: string;
    content_type?: string;
  }>;
}

interface DiscordEvent {
  id: string;
  name: string;
  description: string;
  scheduled_start_time: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  timestamp: string;
}

interface FeaturedPhoto {
  id: string;
  url: string;
  alt: string;
}

interface FeaturedVideo {
  title: string;
  thumbnail: string;
  youtubeId: string;
}

/* ---------------------------------------------
   BASE DISCORD FETCHER
--------------------------------------------- */
async function fetchDiscord(endpoint: string) {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    console.warn("Discord bot token not configured");
    return null;
  }

  try {
    const response = await fetch(`${DISCORD_API_BASE}${endpoint}`, {
      headers: { Authorization: `Bot ${token}` },
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      console.error(`Discord API error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch from Discord:", error);
    return null;
  }
}

/* ---------------------------------------------
   REAL EVENTS (NO MOCK)
--------------------------------------------- */
export async function getUpcomingEvents(): Promise<Event[]> {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) return [];

  const events: DiscordEvent[] | null = await fetchDiscord(
    `/guilds/${guildId}/scheduled-events`
  );

  if (!events) return [];

  return events
    .filter((event) => new Date(event.scheduled_start_time) > new Date())
    .slice(0, 3)
    .map((event) => {
      const date = new Date(event.scheduled_start_time);
      return {
        id: event.id,
        title: event.name,
        date: date.toISOString().split("T")[0],
        time: date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit"
        }),
        description: event.description ?? ""
      };
    });
}

/* ---------------------------------------------
   REAL ANNOUNCEMENTS (NO MOCK)
--------------------------------------------- */
export async function getAnnouncements(): Promise<Announcement[]> {
  const channelId = process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID;
  if (!channelId) return [];

  const messages: DiscordMessage[] | null = await fetchDiscord(
    `/channels/${channelId}/messages?limit=10`
  );

  if (!messages) return [];

  return messages.slice(0, 3).map((msg) => {
    const timestamp = new Date(msg.timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    let timeAgo = diffDays > 0
      ? `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
      : diffHours > 0
      ? `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
      : "Just now";

    return {
      id: msg.id,
      title: msg.embeds?.[0]?.title || msg.content.split("\n")[0] || "Announcement",
      content:
        msg.embeds?.[0]?.description || msg.content || "",
      timestamp: timeAgo
    };
  });
}

/* ---------------------------------------------
   REAL FEATURED PHOTOS (NO MOCK)
--------------------------------------------- */
export async function getFeaturedPhotos(): Promise<FeaturedPhoto[]> {
  const channelId = process.env.DISCORD_FEATURED_PHOTOS_CHANNEL_ID;
  if (!channelId) {
    console.warn("DISCORD_FEATURED_PHOTOS_CHANNEL_ID is not set");
    return [];
  }

  const raw = await fetchDiscord(`/channels/${channelId}/messages?limit=25`);

  if (!raw || !Array.isArray(raw)) {
    console.warn("No messages returned for featured photos:", raw);
    return [];
  }

  const messages = raw as DiscordMessage[];

  const photos: FeaturedPhoto[] = [];

  for (const msg of messages) {
    if (photos.length >= 3) break;

    // 1️⃣ Prefer first attachment if present
    const attachment = msg.attachments && msg.attachments[0];

    // 2️⃣ Fallback to embed image or thumbnail
    const embedWithImage = msg.embeds?.find(
      (e) => e.image?.url || e.thumbnail?.url
    );

    const imageUrl =
      attachment?.url ||
      embedWithImage?.image?.url ||
      embedWithImage?.thumbnail?.url;

    if (!imageUrl) {
      continue;
    }

    const alt =
      msg.content ||
      embedWithImage?.description ||
      "House Wolf featured photo";

    photos.push({
      id: msg.id,
      url: imageUrl,
      alt: alt.substring(0, 120),
    });
  }

  console.log("Resolved featured photos:", photos);

  return photos;
}


/* ---------------------------------------------
   FEATURED VIDEO (no mock except default)
--------------------------------------------- */
export async function getFeaturedVideo(): Promise<FeaturedVideo> {
  const youtubeId = process.env.YOUTUBE_FEATURED_VIDEO_ID;
  const thumbnail = process.env.YOUTUBE_FEATURED_VIDEO_THUMBNAIL;
  const title = process.env.YOUTUBE_FEATURED_VIDEO_TITLE;

  if (youtubeId) {
    return {
      youtubeId,
      thumbnail: thumbnail?.replace("http://", "https://") || "/images/video-thumb.jpg",
      title: title || "Featured Video"
    };
  }

  return {
    youtubeId: "dQw4w9WgXcQ",
    thumbnail: "/images/video-thumb.jpg",
    title: "Featured Video"
  };
}