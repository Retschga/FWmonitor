/* eslint-disable no-console */
/* eslint-disable no-undef */
'use strict';

const staticCacheName = 'cache-vers-2021-09-06-001';
console.log('Loaded service worker! Cache Version ' + staticCacheName);

const filesToCache = ['/app/offline'];

const url_map_forstrettpkt = '/rettPunkte.geojson';
const url_map_hydranten = '/api/v1/hydrant/';
const url_alarm_isalarm = '/api/v1/alarm/isalarm';
const url_alarm_list = '/api/v1/alarm/list';
const url_alarm_last = '/api/v1/alarm/last';

function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

// FETCH Helper functions
// https://jasonwatmore.com/post/2020/04/18/fetch-a-lightweight-fetch-wrapper-to-simplify-http-requests
function fetch_post(url, body, json = false, timeout = 20000) {
    const controller = new AbortController();
    const requestOptions = {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-cache'
    };
    setTimeout(() => controller.abort(), timeout);
    if (json) return fetch(url, requestOptions).then(fetch_handleResponse_json);
    else return fetch(url, requestOptions).then(fetch_handleResponse_text);
}
function fetch_handleResponse_json(response) {
    return response.text().then((text) => {
        const data = text && JSON.parse(text);

        if (!response.ok) {
            const error = (data && data.message) || response.statusText;
            return Promise.reject(error);
        }

        return data;
    });
}
function fetch_handleResponse_text(response) {
    return response.text().then((text) => {
        if (!response.ok) {
            const error = response.statusText;
            return Promise.reject(error);
        }

        return text;
    });
}

// -------- Service Worker PUSH NOTIFICATION --------
self.addEventListener('push', (ev) => {
    // Notification Daten
    const data = ev.data.json();
    console.log('Got push', data);

    // Not After
    if (Date.parse(data.notAfter) < new Date()) {
        console.log('Keine Notification: Zeit Überschritten');
        return;
    }

    // Zeige Notification
    function notify(data) {
        console.log('Show Notification');
        return self.registration.showNotification(data.title, {
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

    let notificationQueue = [];

    for (let i = 0; i < data.alerts; i++) {
        console.log('Queue notification ' + (i + 1) + '/' + data.alerts);
        let notification = wait(i * 2000).then(() => notify(data));
        notificationQueue.push(notification);
    }

    const promiseChain = Promise.all(notificationQueue);

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
    const action = JSON.parse(event.action);
    let url = new URL('api/v1/' + action.url, self.location.origin);
    let params = action.parameter;
    console.log('notification action', url, params);
    fetch_post(url, params);
});

// -------- Service Worker FETCH --------
this.addEventListener('fetch', function (event) {
    //	console.log('Fetch event for ', event.request.url);
    event.respondWith(
        caches
            .match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    console.log('Found ', event.request.url, ' in cache');
                    return response;
                }

                // Netzwerk Request
                console.log('Network request for ', event.request.url);
                return fetch(event.request).then(async (response) => {
                    /*
                    if (response.status === 404) {
                        return caches.match('/app/404.html');
                    }
                    */
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    if (response.type === 'error' || response.type === 'opaque') {
                        return Promise.resolve(); // do not put in cache network errors
                    }

                    if (
                        event.request.url.indexOf(url_alarm_list) == -1 &&
                        event.request.url.indexOf(url_alarm_last) == -1 &&
                        event.request.url.indexOf(url_alarm_isalarm) == -1 &&
                        (event.request.url.indexOf('/app/') != -1 ||
                            event.request.url.indexOf('.css') != -1 ||
                            event.request.url.indexOf('.js') != -1 ||
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
                    return caches.match('/app/offline');
                }

                var init = { status: 444, statusText: 'offline' };
                return new Response(null, init);
            })
    );
});

// -------- Service Worker INSTALLATION --------
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
