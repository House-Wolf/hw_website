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
  price?: number | null;
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
    // STEP 1: Search for a page on star-citizen.wiki API (more structured)
    const apiRes = await fetch(
      `https://api.star-citizen.wiki/api/v2/items?filter[name]=${encodedQuery}&include=uex_prices`,
      { next: { revalidate: 3600 } }
    );

    if (apiRes.ok) {
      const apiJson = await apiRes.json();
      const items = apiJson?.data || [];

      if (items.length > 0) {
        // Look for the first item that has a price
        let selectedItem = items[0];
        let minPrice: number | null = null;

        for (const item of items) {
          if (item.uex_prices && Array.isArray(item.uex_prices)) {
            const buyPrices = item.uex_prices
              .map((p: any) => p.price_buy)
              .filter((p: any) => p > 0);
            if (buyPrices.length > 0) {
              minPrice = Math.min(...buyPrices);
              selectedItem = item;
              break; // Found one with a price!
            }
          }
          
          // Also check shops if uex_prices is empty
          if (!minPrice && item.shops && Array.isArray(item.shops)) {
             const shopPrices = item.shops
               .map((s: any) => s.pivot?.price_buy || s.price_buy)
               .filter((p: any) => p > 0);
             if (shopPrices.length > 0) {
               minPrice = Math.min(...shopPrices);
               selectedItem = item;
               break;
             }
          }
        }

        return {
          uuid: selectedItem.uuid,
          name: selectedItem.name,
          description: selectedItem.description?.en_EN || selectedItem.description?.de_DE || null,
          image: selectedItem.images?.[0]?.original_url || null,
          wikiUrl: `https://starcitizen.tools/${encodeURIComponent(selectedItem.name.replace(/ /g, "_"))}`,
          price: minPrice,
        };
      }
    }

    // FALLBACK: Original search via starcitizen.tools API
    const searchRes = await fetch(
      `https://starcitizen.tools/api.php?action=query&list=search&srsearch=${encodedQuery}&format=json&origin=*`,
      { next: { revalidate: 3600 } }
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

    const detailRes = await fetch(
      `https://starcitizen.tools/api.php?action=query&prop=extracts|pageimages&exintro=1&explaintext=1&piprop=original&titles=${encodeURIComponent(
        pageTitle
      )}&format=json&origin=*`,
      { next: { revalidate: 3600 } }
    );

    if (!detailRes.ok) {
      throw new Error(`Wiki detail fetch failed (${detailRes.status})`);
    }

    const detailJson = await detailRes.json();
    const page = Object.values(detailJson.query.pages)[0] as {
      extract?: string;
      original?: { source?: string };
    };

    return {
      name: pageTitle,
      description: page.extract || "No description available.",
      image: page.original?.source || null,
      wikiUrl: pageUrl,
      price: null,
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
