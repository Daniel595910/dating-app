/// <reference lib="webworker" />
/// <reference types="vite-plugin-pwa/client" />

declare const self: ServiceWorkerGlobalScope;

// Service Worker for Dating App PWA — caching + push notifications
const CACHE_NAME = 'dating-app-v5';
const RUNTIME_CACHE = 'dating-app-runtime-v5';

// VitePWA replaces this exact token with the precache manifest.
// Do not rename or wrap it — workbox-build string-matches on it.
const STATIC_ASSETS: string[] = Array.from(
  new Set(self.__WB_MANIFEST.map((entry) => entry.url))
);

// ==================== INSTALL ====================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ==================== ACTIVATE ====================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// ==================== FETCH ====================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.url.includes('.supabase.co')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  event.respondWith(handleStaticRequest(request));
});

async function handleApiRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: 'offline', message: 'You are offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    if (request.mode === 'navigate') return cache.match('/index.html');
    throw new Error('offline');
  }
}

// ==================== PUSH ====================
self.addEventListener('push', (event) => {
  let data: any = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Dating App', body: event.data ? event.data.text() : '' };
  }

  const type = data.data?.type || 'system';

  // Default vibrate patterns per notification type
  const vibrateByType: Record<string, number[]> = {
    message: [200, 100, 200],
    match: [300, 100, 300, 100, 300],
    connection: [250, 100, 250],
    like: [150],
    comment: [150, 100, 150],
    community: [200],
    system: [100],
  };

  // Default actions per type
  const actionsByType: Record<string, { action: string; title: string }[]> = {
    message: [{ action: 'open', title: 'Open' }],
    match: [{ action: 'open', title: 'Open' }],
    connection: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    like: [{ action: 'open', title: 'Open' }],
    comment: [{ action: 'open', title: 'Open' }],
    community: [{ action: 'open', title: 'Open' }],
    system: [{ action: 'open', title: 'Open' }],
  };

  const title = data.title || 'Dating App';

  const options: NotificationOptions & Record<string, any> = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    image: data.image,                              // optional hero image
    data: {
      ...(data.data || {}),
      type,
    },
    tag: data.tag || data.data?.tag || 'default',   // grouping key
    renotify: data.renotify !== undefined ? data.renotify : true,
    vibrate: data.vibrate || vibrateByType[type] || [200],
    actions: data.actions || actionsByType[type] || [{ action: 'open', title: 'Open' }],
    timestamp: Date.now(),
    requireInteraction: false,
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ==================== NOTIFICATION CLICK ====================
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const notificationData = event.notification.data || {};
  event.notification.close();

  // Dismiss action — just close, do nothing
  if (action === 'dismiss') {
    return;
  }

  // Open (or default click) — focus or open the app at the deep link
  const url = notificationData.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) return client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});