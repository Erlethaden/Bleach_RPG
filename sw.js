var CACHE = 'reiatsu100-pwa-v3';
var ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      // pojedynczo — brak ikony nie wysypuje instalacji
      return Promise.all(ASSETS.map(function(a) { return c.add(a).catch(function() {}); }));
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; })
                             .map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var url = e.request.url;
  // nigdy nie cache'uj Firebase ani Google — dane muszą być świeże
  if (url.indexOf('firestore.googleapis.com') >= 0 ||
      url.indexOf('firebase') >= 0 ||
      url.indexOf('googleapis.com') >= 0 ||
      url.indexOf('gstatic.com') >= 0 ||
      url.indexOf('identitytoolkit') >= 0) return;

  var isPage = e.request.mode === 'navigate' || url.indexOf('index.html') >= 0 || url.endsWith('/');

  if (isPage) {
    // NETWORK-FIRST: aplikacja nigdy nie zostaje na starej wersji.
    e.respondWith(
      fetch(e.request).then(function(res) {
        var clone = res.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        return res;
      }).catch(function() { return caches.match(e.request); })
    );
    return;
  }

  // reszta (ikony, manifest): cache-first
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(res) {
        var clone = res.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        return res;
      });
    })
  );
});
