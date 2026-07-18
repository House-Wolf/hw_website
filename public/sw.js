const STATIC_CACHE = 'hw-static-v2';
const API_CACHE = 'hw-api-v2';
const PT_CACHE = 'hw-pt-v1';

const PRECACHE_URLS = ['/', '/offline', '/manifest.json'];

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

const IDB_NAME = 'packtracker-v1';
const IDB_VERSION = 1;

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = ({ target }) => {
      const db = target.result;
      if (!db.objectStoreNames.contains('pt-cache')) {
        db.createObjectStore('pt-cache', { keyPath: 'url' });
      }
      if (!db.objectStoreNames.contains('pt-queue')) {
        const store = db.createObjectStore('pt-queue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('by-time', 'queuedAt');
      }
    };
    req.onsuccess = ({ target }) => resolve(target.result);
    req.onerror = ({ target }) => reject(target.error);
  });
}

async function idbGet(storeName, key) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = ({ target }) => resolve(target.result);
    req.onerror = ({ target }) => reject(target.error);
  });
}

async function idbPut(storeName, value) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(value);
    req.onsuccess = ({ target }) => resolve(target.result);
    req.onerror = ({ target }) => reject(target.error);
  });
}

async function idbGetAll(storeName) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = ({ target }) => resolve(target.result);
    req.onerror = ({ target }) => reject(target.error);
  });
}

async function idbDelete(storeName, key) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(key);
    req.onsuccess = ({ target }) => resolve(target.result);
    req.onerror = ({ target }) => reject(target.error);
  });
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const allowed = new Set([STATIC_CACHE, API_CACHE, PT_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !allowed.has(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ─── Background Sync ──────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'pt-sync') {
    event.waitUntil(flushQueue());
  }
});

async function flushQueue() {
  const queue = await idbGetAll('pt-queue');
  if (!queue.length) return;

  const results = await Promise.allSettled(
    queue.map(async (item) => {
      const response = await fetch(item.url, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: item.body ?? undefined,
        credentials: 'same-origin',
      });
      if (response.ok) {
        await idbDelete('pt-queue', item.id);
      }
    })
  );

  const synced = results.filter((r) => r.status === 'fulfilled').length;
  if (synced > 0) {
    const clientList = await self.clients.matchAll({ type: 'window' });
    clientList.forEach((client) =>
      client.postMessage({ type: 'PT_SYNC_COMPLETE', count: synced })
    );
  }
}

// ─── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'PackTracker', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'PackTracker', {
      body: payload.body,
      icon: '/images/pwa/icon-192.png',
      badge: '/images/pwa/icon-192.png',
      tag: payload.tag ?? 'packtracker',
      renotify: true,
      data: { url: payload.url ?? '/pack-tracker' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? '/pack-tracker';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      })
  );
});

// ─── Fetch Handling ───────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (!url.protocol.startsWith('http')) return;

  // PackTracker GET routes: network-first with IDB fallback + cache write
  if (url.pathname.startsWith('/api/packtracker/') && request.method === 'GET') {
    event.respondWith(handlePackTrackerGet(request, url));
    return;
  }

  // PackTracker mutations: network-first, queue on failure
  if (url.pathname.startsWith('/api/packtracker/') && request.method !== 'GET') {
    event.respondWith(handlePackTrackerMutation(request, url));
    return;
  }

  // Other API routes: network-first, stale-while-revalidate fallback
  if (url.pathname.startsWith('/api/') && request.method === 'GET') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets: cache-first
  if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|mp3)(\?.*)?$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Navigation: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/offline').then((r) => r || caches.match('/'))
      )
    );
    return;
  }

  // Default: network with cache fallback
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

async function handlePackTrackerGet(request, url) {
  const cacheKey = url.pathname + url.search;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      // Write to both Cache API and IDB for offline reads
      caches.open(PT_CACHE).then((c) => c.put(request, clone));
      response.clone().json().then((data) => {
        idbPut('pt-cache', { url: cacheKey, data, cachedAt: Date.now() }).catch(() => {});
      }).catch(() => {});
    }
    return response;
  } catch {
    // Try Cache API first
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fall back to IDB
    const idbEntry = await idbGet('pt-cache', cacheKey).catch(() => null);
    if (idbEntry) {
      return new Response(JSON.stringify(idbEntry.data), {
        headers: { 'Content-Type': 'application/json', 'X-SW-Cache': 'idb' },
      });
    }
    return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handlePackTrackerMutation(request, url) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    // Queue for background sync
    const body = await request.clone().text().catch(() => null);
    await idbPut('pt-queue', {
      url: url.pathname + url.search,
      method: request.method,
      body,
      queuedAt: Date.now(),
    }).catch(() => {});

    // Register background sync if supported
    if ('sync' in self.registration) {
      await self.registration.sync.register('pt-sync').catch(() => {});
    }

    return new Response(
      JSON.stringify({ queued: true, message: 'Action queued — will sync when online' }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
