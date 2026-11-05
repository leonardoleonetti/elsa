/* Elsa web - service worker: l'app funziona anche senza connessione.
 * Strategia: risposta dalla cache e aggiornamento in background
 * (al caricamento successivo si usa la versione nuova).
 * Cambiare VERSIONE a ogni pubblicazione per rinnovare subito la cache.
 */
var VERSIONE = 'elsa-web-1.1.3';
var FILE = [
  './',
  'index.html',
  'Elsa.html',
  'Elsa_EN.html',
  'manifest.webmanifest',
  'manifest_en.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-180.png',
  'icons/icon-maskable-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSIONE).then(function (c) { return c.addAll(FILE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (nomi) {
    return Promise.all(nomi.filter(function (n) { return n !== VERSIONE; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(VERSIONE).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (inCache) {
      var rete = fetch(req).then(function (risposta) {
        if (risposta && risposta.ok) cache.put(req, risposta.clone());
        return risposta;
      }).catch(function () { return inCache; });
      return inCache || rete;
    });
  }));
});
