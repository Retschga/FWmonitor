/* eslint-disable no-console */
/* eslint-disable no-undef */
'use strict';

const staticCacheName = 'cache-vers-2021-09-06-001';
console.log('Loaded service worker! Cache Version ' + staticCacheName);

const filesToCache = ['/car/offline'];

const url_map_forstrettpkt = '/rettPunkte.geojson';
const url_map_hydranten = '/api/v1/hydrant/';
const url_alarm = '/api/v1/alarm/';
const url_alarm_isalarm = '/api/v1/alarm/isalarm';
const url_alarm_list = '/api/v1/alarm/list';
const url_alarm_last = '/api/v1/alarm/last';

// -------- Service Worker FETCH --------
this.addEventListener('fetch', function (event) {
    //	console.log('Fetch event for ', event.request.url);
    event.respondWith(
        caches
            .match(event.request)
            .then((response) => {
                if (response) {
                    console.log('Found ', event.request.url, ' in cache');
                    return response;
                }
                console.log('Network request for ', event.request.url);

                return fetch(event.request).then(async (response) => {
                    /*				if (response.status === 404) {
                        return caches.match('/app/404.html');
                    }
    */
                    // cachen
                    if (
                        event.request.url.indexOf(url_alarm_list) == -1 &&
                        event.request.url.indexOf(url_alarm_last) == -1 &&
                        event.request.url.indexOf(url_alarm_isalarm) == -1 &&
                        (event.request.url.indexOf('/car/') != -1 ||
                            event.request.url.indexOf('.css') != -1 ||
                            event.request.url.indexOf('.js') != -1 ||
                            event.request.url.indexOf(url_alarm) != -1 ||
                            event.request.url.indexOf(url_map_hydranten) != -1 ||
                            event.request.url.indexOf(url_map_forstrettpkt) != -1 ||
                            event.request.url.indexOf('tile') != -1)
                    ) {
                        console.log('cached:', event.request.url);
                        const cache = await caches.open(staticCacheName);
                        cache.put(event.request.url, response.clone());
                    }

                    return response;
                });
            })
            .catch((error) => {
                console.log('---- SW ERROR ----', error);
                if (event.request.mode === 'navigate') {
                    return caches.match('/car/offline');
                }

                var init = { status: 444, statusText: 'offline' };
                return new Response(null, init);
            })
    );
});

self.addEventListener('install', (event) => {
    // prevents the waiting, meaning the service worker activates
    // as soon as it's finished installing
    // NOTE: don't use this if you don't want your sw to control pages
    // that were loaded with an older version
    self.skipWaiting();

    event.waitUntil(
        (async () => {
            try {
                const cache = await caches.open(staticCacheName);
                const total = filesToCache.length;
                let installed = 0;

                await Promise.all(
                    filesToCache.map(async (url) => {
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
                    })
                );

                if (installed === total) {
                    console.info(
                        `application successfully installed (${installed}/${total} files added in cache)`
                    );
                } else {
                    console.info(
                        `application partially installed (${installed}/${total} files added in cache)`
                    );
                }
            } catch (e) {
                console.error(`unable to install application, ${e.message}`);
            }
        })()
    );
});

self.addEventListener('activate', (event) => {
    console.log('Activating new service worker...');

    const cacheAllowlist = [staticCacheName];

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
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
                    invokeServiceWorkerUpdateFlow(registration);
                } else {
                    // otherwise it's the first install, nothing to do
                    console.log('Service Worker initialized for the first time');
                }
            }
        });
    }
});
