/**
 * @component localStorage.ts
 * @description Utility functions for managing localStorage with expiry support.
 * @author House Wolf Dev Team
 */
export interface StorageItem<T> {
  value: T;
  expiry: number; // Unix ms timestamp
}

/**
 * @component tryParseJSON
 * @description Safely parse a JSON string, returning null on failure.
 * @param str - The JSON string to parse.
 * @returns The parsed object or null if parsing fails.
 * @author House Wolf Dev Team
 */
function tryParseJSON<T>(str: string | null): T | null {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

 /**
  * @component isBrowser
  * @description Check if the code is running in a browser environment.
  * @returns True if in a browser, false otherwise.
  * @author House Wolf Dev Team
  */
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * @component setWithExpiry
 * @description Store a value in localStorage with an optional expiry time.
 * @param key - The key under which to store the value. 
 * @param value - The value to store.
 * @param ttlMs - Time to live in milliseconds (default: 7 days).
 * @author House Wolf Dev Team
 */
export function setWithExpiry<T>(
  key: string,
  value: T,
  ttlMs: number = 7 * 24 * 60 * 60 * 1000
): void {
  if (!isBrowser()) return;

  // Prevent negative or invalid TTL
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    console.warn(`Invalid TTL for "${key}", skipping storage.`);
    return;
  }

  const item: StorageItem<T> = {
    value,
    expiry: Date.now() + ttlMs,
  };

  try {
    localStorage.setItem(key, JSON.stringify(item));
  } catch (error: unknown) {
    // Handle browser storage quota errors
    if (error instanceof Error && error.name === "QuotaExceededError") {
      console.error("localStorage quota exceeded. Clearing expired items…");
      clearExpired();
    } else {
      console.error(`Failed to set localStorage key "${key}":`, error);
    }
  }
}

 /**
  * @component getWithExpiry
  * @description Retrieve a value from localStorage, returning null if expired or not found.
  * @param key - The key of the item to retrieve. 
  * @returns The stored value or null if not found/expired.
  * @author House Wolf Dev Team
  */
export function getWithExpiry<T>(key: string): T | null {
  if (!isBrowser()) return null;

  const raw = localStorage.getItem(key);
  const item = tryParseJSON<StorageItem<T>>(raw);

  if (!item || typeof item.expiry !== "number") {
    // Remove corrupted entry
    localStorage.removeItem(key);
    return null;
  }

  if (Date.now() > item.expiry) {
    localStorage.removeItem(key);
    return null;
  }

  return item.value ?? null;
}

/**
  * @component remove
  * @description Remove an item from localStorage.
  * @param key - The key of the item to remove. 
  * @author House Wolf Dev Team
  */
export function remove(key: string): void {
  if (!isBrowser()) return;

  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.error(`Failed to remove key "${key}"`, err);
  }
}

/** 
 * @component clearExpired
 * @description Remove all expired items from localStorage.
 * @author House Wolf Dev Team
 */
export function clearExpired(): void {
  if (!isBrowser()) return;

  const now = Date.now();
  let cleared = 0;

  for (const key of Object.keys(localStorage)) {
    const item = tryParseJSON<StorageItem<unknown>>(localStorage.getItem(key));

    if (item && typeof item.expiry === "number" && now > item.expiry) {
      localStorage.removeItem(key);
      cleared++;
    }
  }

  if (cleared > 0) {
    console.info(`🧹 Cleared ${cleared} expired localStorage entr${cleared === 1 ? "y" : "ies"}.`);
  }
}

/** 
 * @component clearAllExcept
 * @description Remove all items from localStorage except those specified.
 * @param preserveKeys - An array of keys to preserve.
 * @author House Wolf Dev Team
 */
export function clearAllExcept(preserveKeys: string[] = []): void {
  if (!isBrowser()) return;

  const preserveSet = new Set(preserveKeys);

  for (const key of Object.keys(localStorage)) {
    if (!preserveSet.has(key)) {
      localStorage.removeItem(key);
    }
  }
}
