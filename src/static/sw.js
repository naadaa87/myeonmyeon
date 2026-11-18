// 면면 서비스 워커: 연결이 끊겨도 한 번 열어 본 페이지와 조리 타이머는 열리게 해요.
const CACHE = 'myeon-v1';
const CORE = ['/', '/offline/', '/lab/timer/', '/manifest.webmanifest', '/assets/img/icon-192.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/go/') || url.pathname.startsWith('/admin/')) return;
  // 페이지: 네트워크 먼저, 안 되면 저장해 둔 것
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match('/offline/'))));
    return;
  }
  // 그림·글꼴·스크립트: 저장해 둔 것 먼저
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    })));
  }
});
