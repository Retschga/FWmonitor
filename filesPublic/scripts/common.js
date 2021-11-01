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
    let loader = document.querySelector('#pageloader');
    if (!loader) return;
    loader.classList.remove('loader_out');
    loader.classList.add('loader_in');

    let var_text = loader.querySelector('.var_text');
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
    let loader = document.querySelector('#pageloader');
    if (!loader) return;
    loader.classList.remove('loader_in');
    loader.classList.add('loader_out');
}

/**
 * Geht mit dem Seitenloader eine Seite zurück
 */
function goBack() {
    let loader = document.querySelector('#pageloader');
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

// **** Hilfsfunktionen ****
function tab_switch(pageName, elmnt) {
    // Hide all elements with class="tabcontent" by default */
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName('tabcontent');
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = 'none';
    }

    // Remove the background color of all tablinks/buttons
    tablinks = document.getElementsByClassName('tablink');
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove('tablink_active');
    }

    // Show the specific tab content
    document.getElementById(pageName).style.display = 'block';

    elmnt.classList.add('tablink_active');
}

function accordion_switch(elmnt) {
    /* Toggle between adding and removing the "active" class,
        to highlight the button that controls the panel */
    elmnt.classList.toggle('accordion_active');

    /* Toggle between hiding and showing the active panel */
    var panel = elmnt.nextElementSibling;
    if (panel.style.display === 'block') {
        panel.style.display = 'none';
    } else {
        panel.style.display = 'block';
    }
}

/**
 * Selektiert einen Wert in einem Dropdown-Element
 * @param {*} s Element
 * @param {*} v Wert
 * @returns {boolean} Element gefunden
 */
function setSelectedIndex(s, v) {
    for (var i = 0; i < s.options.length; i++) {
        if (s.options[i].value == v) {
            s.options[i].selected = true;
            return true;
        }
    }
    return false;
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
    let div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}
function htmlDecode(input) {
    let e = document.createElement('div');
    e.innerHTML = input;
    return e.childNodes.length === 0 ? '' : e.childNodes[0].nodeValue;
}

function isIos() {
    return (
        ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(
            navigator.platform
        ) ||
        // iPad on iOS 13 detection
        (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
    );
}

function getPWADisplayMode() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (document.referrer.startsWith('android-app://')) {
        return 'twa';
    } else if (navigator.standalone || isStandalone) {
        return 'standalone';
    }
    return 'browser';
}

// Detects if device is in standalone mode
const isInStandaloneMode = () => getPWADisplayMode() == 'standalone';

const userAgent = window.navigator.userAgent.toLowerCase();
const safari = /safari/.test(userAgent);

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
function fetch_get(url, xxxx, timeout = 20000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const requestOptions = {
        method: 'GET',
        cache: 'no-cache',
        signal: controller.signal
    };

    return fetch(url, requestOptions).then(fetch_handleResonse).catch(fetch_handleError);
}
function fetch_post(url, body, xxxx, timeout = 20000) {
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

// -------- Base64 Decoding --------
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

// -------- Notification Permission --------
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

// Icons Karte
var styleCache = {
    pipe: new ol.style.Style({
        image: new ol.style.Icon({ src: '/images/map_marker_hydrant_pipe.png' })
    }),
    wall: new ol.style.Style({
        image: new ol.style.Icon({ src: '/images/map_marker_hydrant_wall.png' })
    }),
    pillar: new ol.style.Style({
        image: new ol.style.Icon({ src: '/images/map_marker_hydrant_ueberflur.png' })
    }),
    underground: new ol.style.Style({
        image: new ol.style.Icon({ src: '/images/map_marker_hydrant_unterflur.png' })
    }),
    pond: new ol.style.Style({
        image: new ol.style.Icon({ src: '/images/map_marker_openwater.png' })
    }),
    water_tank: new ol.style.Style({
        image: new ol.style.Icon({ src: '/images/map_marker_tank.png' })
    }),
    rettPkt: new ol.style.Style({
        image: new ol.style.Icon({
            src: '/images/map_marker_rettPkt.png',
            scale: 0.1
        })
    }),
    posMarker: new ol.style.Style({
        image: new ol.style.Icon({ src: '/images/map_marker_pos.png' })
    }),
    destMarker: new ol.style.Style({
        image: new ol.style.Icon({ src: '/images/map_marker_finish.png' })
    }),
    circleDest: new ol.style.Style({
        image: new ol.style.Circle({
            radius: 30,
            stroke: new ol.style.Stroke({
                color: 'red'
            }),
            fill: new ol.style.Fill({
                color: '#3399CCBB'
            })
        })
    }),
    streetDest: new ol.style.Style({
        stroke: new ol.style.Stroke({
            width: 6,
            color: [245, 66, 87, 0.8]
        })
    }),
    route: new ol.style.Style({
        stroke: new ol.style.Stroke({
            width: 6,
            color: [47, 55, 82, 0.8]
        })
    }),
    helpline: new ol.style.Style({
        stroke: new ol.style.Stroke({
            width: 6,
            color: [35, 150, 232, 0.8]
        })
    }),
    circleOnRoute: new ol.style.Style({
        image: new ol.style.Circle({
            radius: 10,
            stroke: new ol.style.Stroke({
                color: 'red'
            }),
            fill: new ol.style.Fill({
                color: [0, 204, 0, 0.8]
            })
        })
    }),
    circleNextInstr: new ol.style.Style({
        image: new ol.style.Circle({
            radius: 20,
            stroke: new ol.style.Stroke({
                color: 'red'
            }),
            fill: new ol.style.Fill({
                color: [0, 204, 0, 0.6]
            })
        })
    })
};

var styleFunction = function (feature) {
    let icon = feature.get('title');
    let style = styleCache[icon];
    if (!style) {
        style = styleCache.destMarker;
    }
    return style;
};

// Forst Rettungspunkte
async function add_forstRettPkt(map) {
    let response = await fetch_get(url_map_forstrettpkt, true);

    for (let i = 0; i < response.features.length; i++) {
        response.features[i].properties.title = 'rettPkt';
    }

    console.log('Forst', response);

    let layer = new ol.layer.Vector({
        source: new ol.source.Vector({
            features: new ol.format.GeoJSON({
                featureProjection: 'EPSG:3857',
                dataProjection: 'EPSG:4326'
            }).readFeatures(response)
        }),
        style: styleFunction
    });
    map.addLayer(layer);
}

// Hydranten
function add_hydranten(hydrantenCache, map) {
    let vectorSource_hydrant = new ol.source.Vector({
        features: new ol.format.GeoJSON({
            featureProjection: 'EPSG:3857',
            dataProjection: 'EPSG:4326'
        }).readFeatures({
            type: 'FeatureCollection',
            features: hydrantenCache
        })
    });
    let vectorLayer_hydrant = new ol.layer.Vector({
        source: vectorSource_hydrant,
        style: styleFunction
    });

    map.addLayer(vectorLayer_hydrant);

    const view = map.getView();
    // Zoom event
    view.on('change:resolution', function (e) {
        let zoom = this.getZoom();
        if (hydrantenCache != undefined) {
            if (zoom >= 15) {
                vectorLayer_hydrant.setVisible(true);
            } else if (zoom < 15) {
                vectorLayer_hydrant.setVisible(false);
            }
        }
    });
}

// Zielkreis
function add_circle(lat, lng, map) {
    const layer = new ol.layer.Vector({
        source: new ol.source.Vector({
            features: [
                new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([lng, lat])),
                    title: 'circleDest'
                })
            ]
        }),
        style: styleFunction
    });
    map.addLayer(layer);
}

// Pasitionsmarker
function add_posmarker(lat, lng, map) {
    var posMarker = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([lng, lat])),
        title: 'posMarker'
    });
    let layer = new ol.layer.Vector({
        source: new ol.source.Vector({
            features: [posMarker]
        }),
        style: styleFunction
    });
    map.addLayer(layer);
    return posMarker;
}

// Karte
let map_instance = null;
let map_moved = false;
// eslint-disable-next-line @typescript-eslint/no-empty-function
let map_center = () => {};
let map_position = null;

function createMap(dest, center = false, preload = false, hideControls = false) {
    // Karten Controls
    let control_attribution = new ol.control.Attribution({
        collapsible: false
    });
    let control_fullscreen = new ol.control.FullScreen({
        source: 'mapid'
    });
    let btnCenter = /*@__PURE__*/ (function (Control) {
        function btnCenter(opt_options) {
            var options = opt_options || {};

            var button = document.createElement('button');
            button.innerHTML = '<span class="material-icons">filter_center_focus</span>';
            button.className = '';

            var element = document.createElement('div');
            element.className = 'ol-center ol-unselectable ol-control';
            element.appendChild(button);

            Control.call(this, {
                element: element,
                target: options.target
            });

            button.addEventListener('click', this.handleCenter.bind(this), false);
        }

        if (Control) btnCenter.__proto__ = Control;
        btnCenter.prototype = Object.create(Control && Control.prototype);
        btnCenter.prototype.constructor = btnCenter;

        btnCenter.prototype.handleCenter = function handleRotateNorth() {
            map_moved = false;
            map_center();
            setTimeout(function () {
                map_moved = false;
            }, 50);
        };

        return btnCenter;
    })(ol.control.Control);
    let btnSwitchMap = /*@__PURE__*/ (function (Control) {
        function btnSwitchMap(opt_options) {
            var options = opt_options || {};

            var button = document.createElement('button');
            button.innerHTML = '<span class="material-icons">layers</span>';
            button.className = '';

            var element = document.createElement('div');
            element.className = 'ol-center2 ol-unselectable ol-control';
            element.appendChild(button);

            Control.call(this, {
                element: element,
                target: options.target
            });

            button.addEventListener('click', this.handleCenter.bind(this), false);
        }

        if (Control) btnSwitchMap.__proto__ = Control;
        btnSwitchMap.prototype = Object.create(Control && Control.prototype);
        btnSwitchMap.prototype.constructor = btnSwitchMap;

        btnSwitchMap.prototype.handleCenter = function handleRotateNorth() {
            tileLayer_OpenTopoMap.setVisible(!tileLayer_OpenTopoMap.getVisible());
        };

        return btnSwitchMap;
    })(ol.control.Control);

    // Karte View
    let view = new ol.View({
        center: ol.proj.fromLonLat([dest.lng, dest.lat]),
        zoom: 15
    });

    // Kartenlayer
    let layers = [];
    let tileLayer_OSM = new ol.layer.Tile({
        source: new ol.source.OSM({
            url: 'https://{a-c}.tile.openstreetmap.de/{z}/{x}/{y}.png',
            preload: preload ? 18 : 0,
            crossOrigin: null
        })
    });
    let tileLayer_Hillshade = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: 'https://{a-c}.tiles.wmflabs.org/hillshading/{z}/{x}/{y}.png',
            attributions: ['© wmflabs'],
            preload: preload ? 16 : 0,
            maxZoom: 16,
            crossOrigin: null
        })
    });
    let tileLayer_OpenTopoMap = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',
            attributions: ['© OpenTopoMap'],
            crossOrigin: null
        }),
        preload: preload ? 17 : 0
    });
    layers.push(tileLayer_OSM);
    layers.push(tileLayer_Hillshade);
    layers.push(tileLayer_OpenTopoMap);

    // Karte erstellen
    var map = new ol.Map({
        target: 'mapid',
        layers: layers,
        controls: hideControls
            ? []
            : ol.control
                  .defaults({ attribution: false })
                  .extend([
                      control_attribution,
                      control_fullscreen,
                      new btnCenter(),
                      new btnSwitchMap()
                  ]),
        view: view
    });
    map_instance = map;

    // Move Event
    map.on('moveend', function (e) {
        map_moved = true;
    });

    if (center) {
        map_position = [dest.lng, dest.lat];
        map_center = () => {
            //view.setZoom(15);
            view.setCenter(ol.proj.transform(map_position, 'EPSG:4326', 'EPSG:3857'));
            map_moved = false;
            setTimeout(function () {
                map_moved = false;
            }, 50);
            console.log('MAP CENTER (Standard)', map_position, map_moved);
        };
        map_center();
    }

    setTimeout(function () {
        map_moved = false;
        tileLayer_OpenTopoMap.setVisible(false);
    }, 1500);

    return map;
}
