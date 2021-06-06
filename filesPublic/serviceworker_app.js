const staticCacheName = 'cache-vers-2021-05-02-006';
console.log('Loaded service worker! Cache Version ' + staticCacheName);

const filesToCache = ['/app/offline'];

const url_map_forstrettpkt = '/rettPunkte.geojson';
const url_map_hydranten = '/api/v1/hydrant/';
const url_alarm = '/api/v1/alarm/';
const url_alarm_isalarm = '/api/v1/alarm/isalarm';
const url_alarm_list = '/api/v1/alarm/list';
const url_alarm_last = '/api/v1/alarm/last';

function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

// -------- Service Worker PUSH --------
self.addEventListener('push', (ev) => {
    // Notification Daten
    const data = ev.data.json();
    console.log('Got push', data);

    if (Date.parse(data.zeigeBis) < new Date()) {
        console.log('Keine Notification: Zeit Überschritten');
        return;
    }

    function notify(data) {
        return self.registration.showNotification(data.titel, {
            body: data.text,
            icon: '/images/alarm.png',
            //				image: '/images/alarm.png',
            badge: '/images/alarm_badge.png',
            vibrate: [1000],
            sound: '/audio/message.mp3',
            tag: data.tag,
            renotify: true,
            silent: data.silent == true ? true : false,
            timestamp: Date.parse(data.timestamp),
            requireInteraction: true,
            actions: data.actions
        });
    }

    var notQueue = new Array();

    for (let i = 0; i < data.notificationAnzahl; i++) {
        let not = wait(i * 2000).then(() => notify(data));
        notQueue.push(not);
    }

    const promiseChain = Promise.all(notQueue);

    ev.waitUntil(promiseChain);
});

self.addEventListener('notificationclick', function (event) {
    const clickedNotification = event.notification;
    clickedNotification.close();

    //if (!event.action) {
    // Was a normal notification click
    console.log('Notification Click.');

    const urlToOpen = new URL('/app/index', 'https://' + self.location.host).href;

    const promiseChain = clients
        .matchAll({
            type: 'window',
            includeUncontrolled: true
        })
        .then((windowClients) => {
            let matchingClient = null;

            for (let i = 0; i < windowClients.length; i++) {
                const windowClient = windowClients[i];
                if (windowClient.url === urlToOpen) {
                    matchingClient = windowClient;
                    break;
                }
            }

            if (matchingClient) {
                console.log(1);
                return matchingClient.focus();
            } else {
                console.log(2);
                return clients.openWindow(urlToOpen);
            }
        });

    event.waitUntil(promiseChain);

    //	return;
    //}

    // Knopf gerückt
    var url = new URL('app/api/notificationResponse', self.location.origin),
        params = { telegramID: -1, value: event.action };
    Object.keys(params).forEach((key) => url.searchParams.append(key, params[key]));

    fetch(url, {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
        .then((res) => res.json()) // parse response as JSON (can be res.text() for plain response)
        .then((response) => {
            console.log(response);
        })
        .catch((err) => {
            console.log(err);
        });
});

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

                return fetch(event.request).then( async (response) => {
                    /*				if (response.status === 404) {
                        return caches.match('/app/404.html');
                    }
    */
                   // cachen
                   if (
                    event.request.url.indexOf(url_alarm_list) == -1 &&
                    event.request.url.indexOf(url_alarm_last) == -1 &&
                    event.request.url.indexOf(url_alarm_isalarm) == -1 && (
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
                console.log('---- OFFLINE ----');
                return caches.match('/app/offline');
            })
    );
});

/*
this.addEventListener('install', event => {
    console.log('Attempting to install service worker and cache static assets');
    event.waitUntil(
          caches.open(staticCacheName)
          .then(cache => {
            return cache.addAll(filesToCache);
          })
    );
});*/

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
