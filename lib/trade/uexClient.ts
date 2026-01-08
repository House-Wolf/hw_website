// lib/uex/client.ts

const DEFAULT_UEX_BASE_URL = "https://api.uexcorp.uk/2.0";

type UexFetchOptions = {
  query?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
  retries?: number;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function uexGet<T>(
  path: string,
  options: UexFetchOptions = {}
): Promise<T> {
  const baseUrl = process.env.UEX_API_BASE_URL || DEFAULT_UEX_BASE_URL;
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.replace(/^\/+/, "");
  const url = new URL(normalizedPath, normalizedBase);

  const timeoutMs = options.timeoutMs ?? 12_000;
  const retries = options.retries ?? 2;

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  // ✅ Use QUERY PARAM auth ONLY (most stable with UEX)
  const apiKey = process.env.UEX_API_KEY;
  if (apiKey) {
    url.searchParams.set("api_key", apiKey);
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        if (
          attempt < retries &&
          [429, 502, 503, 504].includes(response.status)
        ) {
          await sleep(300 * (attempt + 1));
          continue;
        }
        throw new Error(`UEX ${response.status}: ${text}`);
      }

      return (await response.json()) as T;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await sleep(300 * (attempt + 1));
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("UEX request failed");
}

/**
 * ✅ ALWAYS normalize arrays
 */
export function normalizeUexArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}
