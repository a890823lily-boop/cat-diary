/* 貓咪日記 Service Worker：預先快取所有檔案，讓 APP 離線也能開啟 */
/* 改版時把 VERSION 加一，並同步修改 index.html 裡 css/js 網址後面的 ?v= */
var VERSION = 35;
var CACHE_NAME = 'cat-diary-v' + VERSION;
var PRECACHE = [
  './',
  'index.html',
  'css/style.css?v=' + VERSION,
  'js/quotes.js?v=' + VERSION,
  'js/db.js?v=' + VERSION,
  'js/game.js?v=' + VERSION,
  'js/memory.js?v=' + VERSION,
  'js/coloring.js?v=' + VERSION,
  'js/fortune.js?v=' + VERSION,
  'js/relax.js?v=' + VERSION,
  'js/worry-talk.js?v=' + VERSION,
  'js/worry.js?v=' + VERSION,
  'js/gratitude.js?v=' + VERSION,
  'js/stickers.js?v=' + VERSION,
  'js/weather.js?v=' + VERSION,
  'js/birthday.js?v=' + VERSION,
  'js/kitty.js?v=' + VERSION,
  'js/music.js?v=' + VERSION,
  'js/app.js?v=' + VERSION,
  'manifest.webmanifest',
  'images/cat-window.jpg',
  'images/cat-floor.jpg',
  'images/cat-cuddle.jpg',
  'images/cat-peek.jpg',
  'images/deco-skate.png',
  'images/deco-suit.png',
  'images/deco-sax.png',
  'images/deco-fish.png',
  'images/deco-wizard.png',
  'images/deco-laptop.png',
  'images/deco-love.png',
  'images/deco-question.png',
  'images/deco-cry.png',
  'images/deco-blep.png',
  'images/deco-surprise.png',
  'images/deco-hmph.png',
  'images/deco-sweat.png',
  'images/deco-shock.png',
  'images/deco-phone.png',
  'images/deco-guitar.png',
  'images/deco-baseball.png',
  'images/deco-fishmonger.png',
  'images/deco-chef.png',
  'images/deco-station.png',
  'images/game-fish.png',
  'images/game-shrimp.png',
  'images/game-cucumber.png',
  'images/stickers/master.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        // reload：略過瀏覽器 HTTP 快取，確保存進去的是伺服器上的最新檔案
        return cache.addAll(PRECACHE.map(function (url) { return new Request(url, { cache: 'reload' }); }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          if (key !== CACHE_NAME) return caches.delete(key);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* 先用網路取得最新版本並更新快取；斷網時改用快取
   no-cache：每次都向伺服器確認，避免拿到瀏覽器 HTTP 快取裡的舊檔 */
self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // 圖片：先用快取（預先存好的），沒有才上網抓，網路不穩時也能顯示
  if (request.destination === 'image' || /\.(png|jpe?g|svg|webp)$/i.test(new URL(request.url).pathname)) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then(function (cached) {
        if (cached) return cached;
        return fetch(request).then(function (response) {
          if (response.ok) {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
          }
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(request, { cache: 'no-cache' })
      .then(function (response) {
        if (response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      })
      .catch(function () {
        return caches.match(request, { ignoreSearch: true }).then(function (cached) {
          if (cached) return cached;
          if (request.mode === 'navigate') return caches.match('index.html');
          return Response.error();
        });
      })
  );
});
