// Iron Ledger — minimal service worker.
// Since the app itself is a single self-contained HTML file (CSS, JS, and
// background image are all inline), caching index.html effectively caches
// the whole app. This just lets it open offline and enables the "Install
// app" prompt on Android/Chrome.

var CACHE_NAME = 'iron-ledger-v1';
var CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache){ return cache.addAll(CORE_ASSETS); })
      .catch(function(){ /* ok if a listed asset isn't present yet */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Cache-first for the app shell, falling back to network, and updating the
// cache in the background so the next offline open has the latest version.
self.addEventListener('fetch', function(event){
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cached){
      var network = fetch(event.request).then(function(response){
        if (response && response.status === 200 && response.type === 'basic'){
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        }
        return response;
      }).catch(function(){ return cached; });

      return cached || network;
    })
  );
});
