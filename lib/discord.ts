import { prepareEvents, type HomepageEvent, type ScheduledEvent } from "./discord/events";
import { prepareAnnouncements, type AnnouncementMessage, type HomepageAnnouncement } from "./discord/announcements";

const DISCORD_API_BASE = "https://discord.com/api/v10";

// In-memory cache to prevent rate limit issues
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 600000; // 10 minutes in milliseconds
const STALE_CACHE_TTL = 3600000; // 1 hour - acceptable for stale data during errors/rate limits

// Request deduplication: track in-flight requests to prevent simultaneous calls
const pendingRequests = new Map<string, Promise<unknown | null>>();

interface DiscordMessage extends AnnouncementMessage {
  author: { username: string; avatar: string };
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

/**
 * @component - FetchDiscord
 * @description - Helper function to fetch data from Discord API with bot token
 * @param endpoint - API endpoint to fetch
 * @returns The JSON response from the Discord API or null if an error occurs
 * @author House Wolf Dev Team
 */
async function fetchDiscord<T>(endpoint: string): Promise<T | null> {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    console.warn("Discord bot token not configured");
    return null;
  }

  // Check in-memory cache first
  const cached = cache.get(endpoint);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    console.log(`Using cached data for ${endpoint}`);
    return cached.data as T;
  }

  // Request deduplication: if there's already a pending request, return it
  const existingRequest = pendingRequests.get(endpoint);
  if (existingRequest) {
    console.log(`Deduplicating request for ${endpoint}`);
    return existingRequest as Promise<T | null>;
  }

  // Create new request and track it
  const requestPromise = (async () => {
    try {
      const response = await fetch(`${DISCORD_API_BASE}${endpoint}`, {
        headers: { Authorization: `Bot ${token}` },
        next: { revalidate: 600 }, // Cache for 10 minutes
        cache: 'force-cache' // Aggressive caching to prevent rate limits
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn(`Discord API rate limit hit for ${endpoint}. Using cached data if available.`);
          // Return stale cache if available during rate limit (accept older data)
          if (cached && now - cached.timestamp < STALE_CACHE_TTL) {
            console.log(`Returning stale cached data for ${endpoint} (age: ${Math.floor((now - cached.timestamp) / 1000)}s)`);
            // Extend the cache timestamp to prevent immediate retries during rate limit
            cache.set(endpoint, { data: cached.data, timestamp: now });
            return cached.data as T;
          }
        } else {
          console.error(`Discord API error: ${response.status} for ${endpoint}`);
        }
        return null;
      }

      const data = await response.json();

      // Store in cache
      cache.set(endpoint, { data, timestamp: now });

      return data as T;
    } catch (error) {
      console.error("Failed to fetch from Discord:", error);
      // Return stale cache if available during error (accept older data)
      if (cached && now - cached.timestamp < STALE_CACHE_TTL) {
        console.log(`Returning stale cached data for ${endpoint} due to error (age: ${Math.floor((now - cached.timestamp) / 1000)}s)`);
        // Extend the cache timestamp to prevent immediate retries during errors
        cache.set(endpoint, { data: cached.data, timestamp: now });
        return cached.data as T;
      }
      return null;
    } finally {
      // Clean up pending request tracker
      pendingRequests.delete(endpoint);
    }
  })();

  // Track the pending request
  pendingRequests.set(endpoint, requestPromise);

  return requestPromise;
}

/**
 * @component - GetUpcomingEvents
 * @description - Fetch upcoming Discord events from the guild scheduled events API
 * @returns - A promise that resolves to an array of upcoming events
 * @author House Wolf Dev Team
 */
export async function getUpcomingEvents(): Promise<HomepageEvent[]> {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) {
    console.warn("DISCORD_GUILD_ID is not set");
    return [];
  }

  const events = await fetchDiscord<ScheduledEvent[]>(
    `/guilds/${guildId}/scheduled-events`
  );

  return prepareEvents(Array.isArray(events) ? events : [], guildId);
}


/** * @component - GetAnnouncements
 * @description - Fetch latest announcements from a Discord channel
 * @returns - A promise that resolves to an array of announcements
 * @author House Wolf Dev Team
 */
export async function getAnnouncements(): Promise<HomepageAnnouncement[]> {
  const channelId = process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID;
  if (!channelId) return [];

  const messages = await fetchDiscord<DiscordMessage[]>(
    `/channels/${channelId}/messages?limit=25`
  );

  return prepareAnnouncements(Array.isArray(messages) ? messages : []);
}


/**
 * @component - GetFeaturedPhotos
 * @description - Fetch featured photos from a Discord channel
 * @returns - A promise that resolves to an array of featured photos
 * @author House Wolf Dev Team
 */
export async function getFeaturedPhotos(): Promise<FeaturedPhoto[]> {
  const channelId = process.env.DISCORD_FEATURED_PHOTOS_CHANNEL_ID;
  if (!channelId) {
    console.warn("DISCORD_FEATURED_PHOTOS_CHANNEL_ID is not set");
    return [];
  }

  const raw = await fetchDiscord<DiscordMessage[]>(
    `/channels/${channelId}/messages?limit=25`
  );

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

  return photos;
}


/**
 * @component - GetFeaturedVideo
 * @description - Fetch featured video details from database, fallback to environment variables
 * @returns - A promise that resolves to the featured video details
 * @author House Wolf Dev Team
 */
export async function getFeaturedVideo(): Promise<FeaturedVideo> {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not configured");
    }

    // First, try to fetch from database
    const { prisma } = await import("./prisma");

    const featuredVideo = await prisma.featured_videos.findFirst({
      where: {
        is_active: true,
      },
      orderBy: {
        updated_at: "desc",
      },
    });

    if (featuredVideo) {
      return {
        youtubeId: featuredVideo.youtube_id,
        title: featuredVideo.title,
        thumbnail: featuredVideo.thumbnail?.replace("http://", "https://") || "/images/video-thumb.jpg",
      };
    }
  } catch (error) {
    if (process.env.DATABASE_URL) {
      console.error("Error fetching featured video from database:", error);
    }
  }

  // Fallback to environment variables if database fetch fails or no active video
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

  // Final fallback
  return {
    youtubeId: "dQw4w9WgXcQ",
    thumbnail: "/images/video-thumb.jpg",
    title: "Featured Video"
  };
}

/**
 * @component - CreateTemporaryChannelInvite
 * @description - Create a temporary invite to a specific channel with 3-day expiration
 * @param channelId - The Discord channel ID to create invite for
 * @returns - A promise that resolves to the invite URL or null if failed
 * @author House Wolf Dev Team
 */
export async function createTemporaryChannelInvite(
  channelId: string
): Promise<string | null> {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    console.warn("Discord bot token not configured");
    return null;
  }

  try {
    const response = await fetch(
      `${DISCORD_API_BASE}/channels/${channelId}/invites`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          max_age: 259200, // 3 days in seconds (3 * 24 * 60 * 60)
          max_uses: 1, // Single use invite
          unique: true, // Always create a new unique invite
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to create Discord invite:", errorData);
      return null;
    }

    const data = await response.json();
    return `https://discord.gg/${data.code}`;
  } catch (error) {
    console.error("Error creating Discord invite:", error);
    return null;
  }
}
