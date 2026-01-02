/**
 * StarCitizen.tools Wiki Integration
 * API Documentation: https://starcitizen.tools/api.php
 */

export interface WikiItem {
  uuid?: string | null;
  name: string;
  description?: string | null;
  image?: string | null;
  wikiUrl?: string | null;
}

/**
 * Search for an item on StarCitizen.tools wiki
 * @param query - Search query (item name)
 * @returns WikiItem or null if not found
 */
export async function searchWiki(query: string): Promise<WikiItem | null> {
  if (!query || !query.trim()) {
    throw new Error("Search query is required");
  }

  const encodedQuery = encodeURIComponent(query.trim());

  try {
    // STEP 1: Search for a page
    const searchRes = await fetch(
      `https://starcitizen.tools/api.php?action=query&list=search&srsearch=${encodedQuery}&format=json&origin=*`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!searchRes.ok) {
      throw new Error(`Wiki search failed (${searchRes.status})`);
    }

    const searchJson = await searchRes.json();
    const firstResult = searchJson?.query?.search?.[0];

    if (!firstResult) {
      return null;
    }

    const pageTitle = firstResult.title;
    const pageUrl = `https://starcitizen.tools/${encodeURIComponent(pageTitle.replace(/ /g, "_"))}`;

    // STEP 2: Get description + image
    const detailRes = await fetch(
      `https://starcitizen.tools/api.php?action=query&prop=extracts|pageimages&exintro=1&explaintext=1&piprop=original&titles=${encodeURIComponent(
        pageTitle
      )}&format=json&origin=*`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!detailRes.ok) {
      throw new Error(`Wiki detail fetch failed (${detailRes.status})`);
    }

    const detailJson = await detailRes.json();
    const page = Object.values(detailJson.query.pages)[0] as {
      extract?: string;
      original?: { source?: string };
    };

    const description = page.extract || "No description available.";
    const image = page.original?.source || null;

    return {
      name: pageTitle,
      description,
      image,
      wikiUrl: pageUrl,
    };
  } catch (error) {
    console.error("Wiki search error:", error);
    throw error;
  }
}

/**
 * Validate if a URL is a valid image URL
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || url.trim() === "") return false;
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Get the first sentence from a description
 */
export function getFirstSentence(text: string): string {
  if (!text) return "";
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0] : text.slice(0, 150) + "...";
}
