/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable no-undef */
'use strict';

if (!('content' in document.createElement('template'))) {
    alert('Ihr Browser wird nicht unterstützt!');
}

/**
 * GET Parameter auslesen und als Globale Variable speichern
 */
var parts = window.location.search.substr(1).split('&');
var $_GET = {};
for (var i = 0; i < parts.length; i++) {
    var temp = parts[i].split('=');
    $_GET[decodeURIComponent(temp[0])] = decodeURIComponent(temp[1]);
}

/**
 * Erstellt ein Cookie
 * @param  {String} 	cname   - Cookie Name
 * @param  {String} 	cvalue  - Cookie Wert
 * @param  {Integer} 	exdays  - Lebesdauer in Tagen
 */
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
    var expires = 'expires=' + d.toGMTString();
    document.cookie = cname + '=' + cvalue + ';' + (exdays ? expires + ';' : '') + 'path=/';
}

/**
 * Gibt den Wert des Cookies zurück
 * @param  {String} 	cname   - Cookie Name
 * @return {String}     Cookie Wert
 */
function getCookie(cname) {
    var name = cname + '=';
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return '';
}

/**
 * Wechselt mit dem Seitenloader zu einer anderen Seite
 * @param  {String} 	url         - Zielseite
 * @param  {Boolean} 	noHistroy   - Aktuelle Seite aus der History entfernen
 */
function loaderIn(url, noHistroy, text) {
    const loader = document.querySelector('#pageloader');
    if (!loader) return;
    loader.classList.remove('loader_out');
    loader.classList.add('loader_in');

    const var_text = loader.querySelector('.var_text');
    if (text) {
        var_text.classList.remove('hidden');
        var_text.innerHTML = text;
    } else {
        var_text.classList.add('hidden');
    }

    if (url) {
        setTimeout(function () {
            if (!noHistroy) {
                window.location.href = url;
            } else {
                window.location.replace(url);
            }
        }, 200);
    }
}

/**
 * Versteckt den Seitenloader
 */
function loaderOut() {
    const loader = document.querySelector('#pageloader');
    if (!loader) return;
    loader.classList.remove('loader_in');
    loader.classList.add('loader_out');
}

/**
 * Geht mit dem Seitenloader eine Seite zurück
 */
function goBack() {
    const loader = document.querySelector('#pageloader');
    loader.classList.remove('loader_out');
    loader.classList.add('loader_in');

    setTimeout(function () {
        window.history.back();
    }, 200);
}

/**
 * Meldet den Benutzer ab
 */
async function logout() {
    loaderIn();
    try {
        const data = await fetch_post('/api/v1/auth/logout', {}, true, 10000);

        if (data.message && data.message == 'OK') {
            setCookie('logout_status', 'true', 1);
            setCookie('token', '', 1);
            loaderIn('login?manuell=true', true);
            return false;
        }
        if (data.message) {
            console.error('Login Fehler: ', data.message);
            alert(data.message);
        }
    } catch (error) {
        console.log(error.message);
    }
    loaderOut();
}

/**
 * Leitet den Benutzer zum Anmeldebildschirm weiter, falls er nicht eingeloggt ist
 */
function redirect_if_logged_out() {
    const logout_status = getCookie('logout_status');
    console.log('logout_status', logout_status);

    if (logout_status == 'true') {
        loaderIn('login', true);
    }
}

/**
 * Kalender summary in Icon und Text teilen
 * @returns { text: string, icon: string }
 */
function parseKalenderSummary(summary) {
    if (!summary) return { text: '', icon: '' };
    try {
        // Terminname in Text und Icon aufreilen
        let text = summary.substring(2);
        let icon = summary.substring(0, 4);
        if (icon.match(/[A-Z0-9äöüÄÖÜß]/i) != null) {
            icon = summary.substring(0, 2);
            if (icon.match(/[A-Z0-9äöüÄÖÜß]/i) != null) {
                text = icon + text;
                kalenderBearbeiten_hasIcon = false;
            }
        }
        return { text: text, icon: icon };
    } catch (error) {
        return { text: summary, icon: '' };
    }
}

/**
 * HTML escapes für text durchführen
 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}
function htmlDecode(input) {
    const elem = document.createElement('div');
    elem.innerHTML = input;
    return elem.childNodes.length === 0 ? '' : elem.childNodes[0].nodeValue;
}

/**
 * Gibt zurück ob System IOS ist
 */
const userAgent = window.navigator.userAgent.toLowerCase();
const safari = /safari/.test(userAgent);
function isIos() {
    return (
        ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(
            navigator.platform
        ) ||
        // iPad on iOS 13 detection
        (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
    );
}

/**
 * Gibt den aktuellen Display Modus zurück
 */
function getPWADisplayMode() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (document.referrer.startsWith('android-app://')) {
        return 'twa';
    } else if (navigator.standalone || isStandalone) {
        return 'standalone';
    }
    return 'browser';
}

/**
 * Gipt zurück ob Display Modus == standalone
 */
const isInStandaloneMode = () => getPWADisplayMode() == 'standalone';

// Input Prefixes
// https://stackoverflow.com/questions/4535963/how-can-i-add-an-unremovable-prefix-to-an-html-input-field
function addFormatter(input, formatFn) {
    let oldValue = input.value;

    const handleInput = (event) => {
        const result = formatFn(input.value, oldValue, event);
        if (typeof result === 'string') {
            input.value = result;
        }

        oldValue = input.value;
    };

    handleInput();
    input.addEventListener('input', handleInput);
}
function regexPrefix(regex, prefix) {
    return (newValue, oldValue) => (regex.test(newValue) ? newValue : newValue ? oldValue : prefix);
}

// FETCH Helper functions
// https://jasonwatmore.com/post/2020/04/18/fetch-a-lightweight-fetch-wrapper-to-simplify-http-requests
function fetch_get(url, xxxx, timeout = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const requestOptions = {
        method: 'GET',
        cache: 'no-cache',
        signal: controller.signal
    };

    return fetch(url, requestOptions).then(fetch_handleResonse).catch(fetch_handleError);
}
function fetch_post(url, body, xxxx, timeout = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const requestOptions = {
        method: 'POST',
        cache: 'no-cache',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };

    return fetch(url, requestOptions).then(fetch_handleResonse).catch(fetch_handleError);
}

function fetch_handleResonse(response) {
    const contentType = response.headers.get('content-type');

    if (!contentType)
        return Promise.reject({ statusText: response.statusText, status: response.status });

    if (contentType.includes('application/json')) {
        return fetch_handleResponse_json(response);
    } else if (contentType.includes('text/html')) {
        return fetch_handleResponse_text(response);
    } else if (contentType.includes('application/geo+json')) {
        return fetch_handleResponse_json(response);
    } else {
        // Other response types as necessary. I haven't found a need for them yet though.
        throw new Error(`Sorry, content-type ${contentType} not supported`);
    }
}

function fetch_handleResponse_json(response) {
    return response.text().then((text) => {
        const data = text && JSON.parse(text);

        if (!response.ok) {
            const error = (data && { statusText: data.message, status: response.status }) || {
                statusText: response.statusText,
                status: response.status
            };
            return Promise.reject(error);
        }

        return data;
    });
}
function fetch_handleResponse_text(response) {
    return response.text().then((text) => {
        if (!response.ok) {
            const error = { statusText: response.statusText, status: response.status };
            return Promise.reject(error);
        }

        return text;
    });
}

function fetch_handleError(error) {
    if (error.status == 401 && window.location.href.indexOf('login') == -1) {
        // UNAUTHORIZED
        loaderIn('login', true, error.statusText);
    } else if (error.status == 444 && window.location.href.indexOf('offline') == -1) {
        // OFFLINE
        loaderIn('offline', true, error.statusText);
    } else if (error.status == 400) {
        // BAD_REQUEST
        alert(error.statusText);
        error.show = true;
    } else if (error.status == 429) {
        // RATE_LIMIT
        alert(error.statusText);
        error.show = true;
    } else if (error.status == 403) {
        // FORBIDDEN
        alert(error.statusText);
        error.show = true;
    } else if (error.status == 404) {
        // NOT_FOUND
        console.log(error.statusText);
        error.show = true;
    } else if (error.status == 500) {
        // INTERNAL_SERVER_ERROR
        console.log(error.statusText);
        error.show = true;
    } else {
        error.show = true;
    }
    return Promise.reject(error);
}

// Base64 Decoding
// https://www.npmjs.com/package/web-push#using-vapid-key-for-applicationserverkey
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    console.log(base64);
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Erfrägt Notification Berechtingungen
 */
async function getNotificationPermission() {
    if (!serviceWorker_registration) {
        throw new Error('No service worker registered!');
    }

    if (Notification.permission === 'granted') {
        serviceWorker_registration.update();
        return;
    }

    return new Promise(function (resolve, reject) {
        const permissionResult = Notification.requestPermission(function (result) {
            resolve(result);
        });

        if (permissionResult) {
            permissionResult.then(resolve, reject);
        }
    }).then(async function (permissionResult) {
        if (permissionResult !== 'granted') {
            throw new Error("We weren't granted permission.");
        } else {
            // Registriere Push
            console.log('Registering push');
            const subscription = await serviceWorker_registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });
            console.log('Registered push');

            // Sende Subscription zum Server
            console.log('Sending Subscribe');

            await fetch_post(url_user_notifications_app_update.replace(':id', user_id), {
                subscription: JSON.stringify(subscription)
            });

            console.log('Sent Subscribe');
        }
    });
}
