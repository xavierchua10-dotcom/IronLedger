// Iron Ledger — minimal service worker.
// Since the app itself is a single self-contained HTML file (CSS, JS, and
// background image are all inline), caching index.html effectively caches
// the whole app. This just lets it open offline and enables the "Install
// app" prompt on Android/Chrome.

// ---------------------------------------------------
// PUSH NOTIFICATIONS (Firebase Cloud Messaging)
// Handles a push that arrives while this tab is closed/backgrounded —
// this is the only code that's still "awake" at that point, so it's
// responsible for actually showing the OS notification. Foreground
// pushes (tab open) are handled separately, inside index.html itself.
// ---------------------------------------------------
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA5zTxIK6Yn81BZ03_rlUUgWjGBkbtL2Wo",
  authDomain: "iron-ledge.firebaseapp.com",
  projectId: "iron-ledge",
  storageBucket: "iron-ledge.firebasestorage.app",
  messagingSenderId: "978680753798",
  appId: "1:978680753798:web:13fdbdb6b4bd3dbc72ab07"
});

var messaging = firebase.messaging();
messaging.onBackgroundMessage(function(payload){
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: './icons/apple-touch-icon.png'
  });
});

var CACHE_NAME = 'iron-ledger-v2';
var CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
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

// Network-first: always try the network so anyone online gets today's
// deploy immediately, no lag, ever. Cache only kicks in as a fallback
// when the network request itself fails — i.e. actually offline — which
// is the only case this app needs to work without a connection at all.
self.addEventListener('fetch', function(event){
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then(function(response){
      if (response && response.status === 200 && response.type === 'basic'){
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
      }
      return response;
    }).catch(function(){
      return caches.match(event.request);
    })
  );
});

