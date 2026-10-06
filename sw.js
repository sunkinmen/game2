/* Service Worker — 離線快取（快取優先；背景更新）。改動檔案後請調高 CACHE 版本號。 */
const CACHE = 'tfight-v2';
const FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg",
  "./js/ai.js",
  "./js/brush.js",
  "./js/sprites.js",
  "./assets/long.png",
  "./assets/long.json",
  "./assets/long_portrait.jpg",
  "./js/combat.js",
  "./js/config.js",
  "./js/fight.js",
  "./js/fighter.js",
  "./js/finput.js",
  "./js/fsettings.js",
  "./js/ftouch.js",
  "./js/fxaudio.js",
  "./js/game.js",
  "./js/menu.js",
  "./js/moves.js",
  "./js/pen.js",
  "./js/rig.js",
  "./js/roster.js",
  "./js/save.js",
  "./js/select.js",
  "./js/stage.js",
  "./js/ui.js",
  "./assets/brush.png",
  "./assets/brush.json"
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  e.respondWith(caches.match(r).then(hit => {
    const net = fetch(r).then(res => { if (res && res.ok && new URL(r.url).origin === location.origin) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; }).catch(() => hit || caches.match('./index.html'));
    return hit || net;
  }));
});
