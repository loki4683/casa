importScripts('shared.js');
const SHELL = 'casa-shell-v6';
const FILES = ['./', 'index.html', 'shared.js', 'gcal.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('casa-shell-') && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

/* rete prima (così gli aggiornamenti arrivano subito), cache se offline */
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => { const cp = r.clone(); caches.open(SHELL).then(c => c.put(e.request, cp)); return r; })
      .catch(() => caches.open(SHELL).then(c => c.match(e.request, { ignoreSearch: true })).then(r => r || caches.match('index.html')))
  );
});

/* controllo periodico in background (app installata su Android/Chrome) */
self.addEventListener('periodicsync', e => {
  if (e.tag === 'casa-check') e.waitUntil(CASA.getJ('./_state').then(S => S && CASA.notify(self.registration, S)));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('./')));
});
