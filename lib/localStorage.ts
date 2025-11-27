
export interface StorageItem<T> {
  value: T;
  expiry: number; // Unix ms timestamp
}


function tryParseJSON<T>(str: string | null): T | null {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}


function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

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
  } catch (error: any) {
    // Handle browser storage quota errors
    if (error?.name === "QuotaExceededError") {
      console.error("localStorage quota exceeded. Clearing expired items…");
      clearExpired();
    } else {
      console.error(`Failed to set localStorage key "${key}":`, error);
    }
  }
}


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


export function remove(key: string): void {
  if (!isBrowser()) return;

  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.error(`Failed to remove key "${key}"`, err);
  }
}


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


export function clearAllExcept(preserveKeys: string[] = []): void {
  if (!isBrowser()) return;

  const preserveSet = new Set(preserveKeys);

  for (const key of Object.keys(localStorage)) {
    if (!preserveSet.has(key)) {
      localStorage.removeItem(key);
    }
  }
}
