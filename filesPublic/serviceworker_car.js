const staticCacheName = 'cache-vers-2021-05-02-005';
console.log('Loaded service worker! Cache Version ' + staticCacheName);

const filesToCache = [
//	'/app/offline.html',
];

function wait(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
}

// -------- Service Worker FETCH --------
this.addEventListener('fetch', function(event) {
    //	console.log('Fetch event for ', event.request.url);
          event.respondWith(
            caches.match(event.request)
            .then(response => {
                  if (response) {
                       console.log('Found ', event.request.url, ' in cache');
                    return response;
                 }
                  console.log('Network request for ', event.request.url);
                  
                  return fetch(event.request)
                .then(response => {
    /*				if (response.status === 404) {
                        return caches.match('/app/404.html');
                    }
    */
                    if(event.request.url.indexOf('/api/v1//alarm/') == -1) {
                        return response;
                    }
                    return caches.open(staticCacheName).then(cache => {
                        cache.put(event.request.url, response.clone());
                        return response;
                    });
                });			  
    
            }).catch(error => {
                console.log('---- OFFLINE ----');
                return caches.match('/app/offline');
            })
         );
});
    
self.addEventListener('install', (event) => {
  // prevents the waiting, meaning the service worker activates
  // as soon as it's finished installing
  // NOTE: don't use this if you don't want your sw to control pages
  // that were loaded with an older version
  self.skipWaiting();

  event.waitUntil((async () => {
    try {
      const cache = await caches.open(staticCacheName);
      const total = filesToCache.length;
      let installed = 0;

      await Promise.all(filesToCache.map(async (url) => {
        let controller;

        try {
          controller = new AbortController();
          const { signal } = controller;
          // the cache option set to reload will force the browser to
          // request any of these resources via the network,
          // which avoids caching older files again
          const req = new Request(url, { cache: 'reload' });
          const res = await fetch(req, { signal });

          if (res && res.status === 200) {
            await cache.put(req, res.clone());
            installed += 1;
          } else {
            console.info(`unable to fetch ${url} (${res.status})`);
          }
        } catch (e) {
          console.info(`unable to fetch ${url}, ${e.message}`);
          // abort request in any case
          controller.abort();
        }
      }));

      if (installed === total) {
        console.info(`application successfully installed (${installed}/${total} files added in cache)`);
      } else {
        console.info(`application partially installed (${installed}/${total} files added in cache)`);
      }
    } catch (e) {
      console.error(`unable to install application, ${e.message}`);
    }
  })());
});
    

self.addEventListener('activate', event => {
    console.log('Activating new service worker...');
  
    const cacheAllowlist = [staticCacheName];
  
    event.waitUntil(
          caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheAllowlist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
          })
    );
    console.log('Activating new service worker... DONE');
});
  

self.addEventListener('updatefound', () => {
    if (registration.installing) {
        // wait until the new Service worker is actually installed (ready to take over)
        registration.installing.addEventListener('statechange', () => {
            if (registration.waiting) {
                // if there's an existing controller (previous Service Worker), show the prompt
                if (navigator.serviceWorker.controller) {
                    invokeServiceWorkerUpdateFlow(registration)
                } else {
                    // otherwise it's the first install, nothing to do
                    console.log('Service Worker initialized for the first time')
                }
            }
        })
    }
})