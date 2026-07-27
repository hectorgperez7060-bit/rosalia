// Rosalia - Service Worker v9 (simple y estable, sin recargas automaticas)
const VERSION = 'v10';
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
  let url; try{ url = new URL(req.url); }catch(_){ return; }
  if(url.origin !== self.location.origin) return;
  const esHTML = req.mode === 'navigate' || (req.headers.get('accept')||'').indexOf('text/html') !== -1;
  if(esHTML){
    e.respondWith(fetch(req).then(function(res){ const c=res.clone(); caches.open(CACHE).then(function(x){ x.put(req,c); }).catch(function(){}); return res; })
      .catch(function(){ return caches.match(req).then(function(r){ return r || caches.match('./index.html'); }); }));
  } else {
    e.respondWith(caches.match(req).then(function(cached){
      const red=fetch(req).then(function(res){ const c=res.clone(); caches.open(CACHE).then(function(x){ x.put(req,c); }).catch(function(){}); return res; }).catch(function(){ return cached; });
      return cached || red;
    }));
  }
});
