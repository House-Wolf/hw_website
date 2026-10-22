/** Convert wiki media-viewer links into URLs that actually return image bytes. */
export function normalizeImageSource(source: string) {
  try {
    const url = new URL(source);
    const prefix = "#/media/File:";
    if (url.protocol !== "https:" || url.hostname !== "starcitizen.tools" || !url.hash.startsWith(prefix)) return source;
    const file = decodeURIComponent(url.hash.slice(prefix.length));
    if (!file || file.includes("/") || file.includes("\\")) return source;
    return `https://starcitizen.tools/Special:Redirect/file/${encodeURIComponent(file)}`;
  } catch {
    return source;
  }
}
