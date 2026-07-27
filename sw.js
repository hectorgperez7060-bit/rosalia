// Rosalía — Service Worker con AUTO-ACTUALIZACIÓN (v6)
// Objetivo: que la app NUNCA se quede pegada en una versión vieja.
//  - Al instalarse toma control inmediato (skipWaiting + clients.claim).
//  - El HTML se pide SIEMPRE a la red primero (network-first): si hay internet,
//    ves la última versión; sin internet, usa la última copia guardada.
//  - Solo toca archivos de ESTE sitio. NO intercepta Firebase, fuentes ni CDNs,
//    así los datos de la familia siempre llegan en vivo.
const VERSION = 'v6';
const CACHE = 'rosalia-' + VERSION;
const CORE = ['./', './index.html', './manifest.json'];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(CORE); }).catch(function(){}));
});

self.addEventListener('activate', function(e){
  e.waitUntil((async function(){
    const keys = await caches.keys();
    await Promise.all(keys.map(function(k){ return k === CACHE ? null : caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function(e){
  const req = e.request;
  if(req.method !== 'GET') return;
  let url;
  try{ url = new URL(req.url); }catch(_){ return; }
  // Solo archivos propios: Firebase, Google Fonts y gstatic pasan sin tocar.
  if(url.origin !== self.location.origin) return;

  const esHTML = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').indexOf('text/html') !== -1;

  if(esHTML){
    // Network-first: siempre lo más nuevo; si no hay red, la copia guardada.
    e.respondWith(
      fetch(req).then(function(res){
        const copia = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copia); }).catch(function(){});
        return res;
      }).catch(function(){
        return caches.match(req).then(function(r){ return r || caches.match('./index.html'); });
      })
    );
  } else {
    // Estáticos: usa caché al instante y actualiza en segundo plano.
    e.respondWith(
      caches.match(req).then(function(cached){
        const red = fetch(req).then(function(res){
          const copia = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copia); }).catch(function(){});
          return res;
        }).catch(function(){ return cached; });
        return cached || red;
      })
    );
  }
});
