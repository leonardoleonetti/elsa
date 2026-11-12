/* Elsa web - service worker: l'app funziona anche senza connessione.
 * Strategia: risposta dalla cache e aggiornamento in background
 * (al caricamento successivo si usa la versione nuova).
 * I file si chiedono sempre al server e non alla cache HTTP del browser,
 * che GitHub Pages fa durare 10 minuti: cosi' dopo una pubblicazione la
 * versione nuova compare gia' alla seconda apertura.
 * Cambiare VERSIONE a ogni pubblicazione per rinnovare subito la cache.
 */
var VERSIONE = 'elsa-web-1.1.7';
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

// dal server, con una breve risposta 304 se il file non e' cambiato
function dalServer(req) {
  if (req.mode === 'navigate') {
    return fetch(req.url, { cache: 'no-cache', credentials: 'include', redirect: 'manual' });
  }
  return fetch(new Request(req, { cache: 'no-cache' }));
}

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSIONE).then(function (c) {
    return c.addAll(FILE.map(function (f) { return new Request(f, { cache: 'no-cache' }); }));
  }).then(function () { return self.skipWaiting(); }));
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
      var rete = dalServer(req).then(function (risposta) {
        if (risposta && risposta.ok) e.waitUntil(cache.put(req, risposta.clone()));
        return risposta;
      }).catch(function () { return inCache; });
      // la copia in cache si aggiorna anche quando la pagina e' gia' servita
      e.waitUntil(rete);
      return inCache || rete;
    });
  }));
});
