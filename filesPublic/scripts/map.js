/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable no-undef */
'use strict';

// Tile Layer URLs
let map_layer1_url = undefined;
let map_layer1_attr = undefined;
let map_layer1_hillshade_url = undefined;
let map_layer1_hillshade_attr = undefined;
let map_layer2_url = undefined;
let map_layer2_attr = undefined;

async function map_getTileLayerUrls() {
    const url = '/api/v1/map/layerurls';

    try {
        const layerUrls = await fetch_get(url, true);
        console.log('getTileLayerUrls', layerUrls);

        map_layer1_url = layerUrls.layer1_url;
        map_layer1_attr = layerUrls.layer1_attr;
        map_layer1_hillshade_url = layerUrls.layer1_hillshade_url;
        map_layer1_hillshade_attr = layerUrls.layer1_hillshade_attr;
        map_layer2_url = layerUrls.layer2_url;
        map_layer2_attr = layerUrls.layer2_attr;
    } catch (error) {
        console.error('getTileLayerUrls', error);
        if (error.show) alert('Aktuelle Layer-Tile-Urls konnten nicht geladen werden.');
    }
}

// Icons Karte
const map_styleCache = {
    undefined: new ol.style.Style({
        image: new ol.style.Icon({ src: '/images/map_marker_hydrant_undefined.png' })
    }),
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

const map_styleFunction = (feature) => {
    let icon = feature.get('title');
    let style = map_styleCache[icon];
    if (!style) {
        style = map_styleCache.destMarker;
    }
    return style;
};

// Forst Rettungspunkte
async function map_add_layerForstRettPkt(map) {
    const response = await fetch_get(url_map_forstrettpkt, true);

    for (let i = 0; i < response.features.length; i++) {
        response.features[i].properties.title = 'rettPkt';
    }

    console.log('Forst', response);

    const layer = new ol.layer.Vector({
        source: new ol.source.Vector({
            features: new ol.format.GeoJSON({
                featureProjection: 'EPSG:3857',
                dataProjection: 'EPSG:4326'
            }).readFeatures(response)
        }),
        style: map_styleFunction
    });
    map.addLayer(layer);
}

// Hydranten
function map_add_layerHydranten(hydrantenCache, map) {
    const vectorSource_hydrant = new ol.source.Vector({
        features: new ol.format.GeoJSON({
            featureProjection: 'EPSG:3857',
            dataProjection: 'EPSG:4326'
        }).readFeatures({
            type: 'FeatureCollection',
            features: hydrantenCache
        })
    });
    const vectorLayer_hydrant = new ol.layer.Vector({
        source: vectorSource_hydrant,
        style: map_styleFunction
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
function map_add_layerCircle(lat, lng, map) {
    const layer = new ol.layer.Vector({
        source: new ol.source.Vector({
            features: [
                new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.fromLonLat([lng, lat])),
                    title: 'circleDest'
                })
            ]
        }),
        style: map_styleFunction
    });
    map.addLayer(layer);
}

// Positionsmarker
function map_add_layerPosmarker(lat, lng, map) {
    const posMarker = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([lng, lat])),
        title: 'posMarker'
    });
    const layer = new ol.layer.Vector({
        source: new ol.source.Vector({
            features: [posMarker]
        }),
        style: map_styleFunction
    });
    map.addLayer(layer);
    return posMarker;
}

// Klickbare Marker
function map_add_markerPopup(map) {
    const container = document.getElementById('map-popup');
    const content = document.getElementById('map-popup-content');
    const closer = document.getElementById('map-popup-closer');

    if (!container) return;

    const overlay = new ol.Overlay({
        element: container,
        autoPan: true,
        autoPanAnimation: {
            duration: 250
        }
    });
    map.addOverlay(overlay);
    closer.onclick = function () {
        overlay.setPosition(undefined);
        closer.blur();
        return false;
    };

    // display popup on click
    map.addEventListener('click', function (evt) {
        const feature = map.forEachFeatureAtPixel(
            evt.pixel,
            function (feature, layer) {
                return feature;
            },
            {
                hitTolerance: 20
            }
        );
        if (feature) {
            const attr = feature.getProperties();
            const geometry = feature.getGeometry();
            let coord = geometry.getCoordinates();

            if (attr.FIELD1) {
                content.innerHTML =
                    `<p>Typ: Forst Rettungspunkt</p>` + `<p>Nummer: ${attr.FIELD1 || 'k.A.'}</p>`;
            } else {
                content.innerHTML =
                    `<p>Typ: ${attr.title || 'k.A.'}</p>` +
                    `<p>Leitung: ${attr.diameter || 'k.A.'}</p>` +
                    `<p>Wasserquelle: ${attr.watersource || 'k.A.'}</p>` +
                    `<p>Position: ${attr.positiondesc || 'k.A.'}</p>`;
            }
            overlay.setPosition(coord);
        } else {
            overlay.setPosition(undefined);
        }
    });
}

// Karte
let map_instance = null;
let map_moved = false;
// eslint-disable-next-line @typescript-eslint/no-empty-function
let map_center = () => {};
let map_position = null;

async function map_createMap(dest, center = false, preload = false, hideControls = false) {
    let tileLayer2_main;

    await map_getTileLayerUrls();

    const control_attribution = new ol.control.Attribution({
        collapsible: false
    });

    const control_fullscreen = new ol.control.FullScreen({
        source: 'mapid'
    });

    const control_center = (function (Control) {
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

    const control_switchMap = (function (Control) {
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
            tileLayer2_main.setVisible(!tileLayer2_main.getVisible());
        };

        return btnSwitchMap;
    })(ol.control.Control);

    // Karte View
    const map_view = new ol.View({
        center: ol.proj.fromLonLat([dest.lng, dest.lat]),
        zoom: 15
    });

    // Kartenlayer
    const layers = [];
    if (map_layer1_url) {
        const tileLayer1_main = new ol.layer.Tile({
            source: new ol.source.OSM({
                url: map_layer1_url,
                attributions: [map_layer1_attr],
                preload: preload ? 18 : 0,
                crossOrigin: null
            })
        });
        layers.push(tileLayer1_main);
    }
    if (map_layer1_hillshade_url) {
        const tileLayer1_hillshade = new ol.layer.Tile({
            source: new ol.source.XYZ({
                url: map_layer1_hillshade_url,
                attributions: [map_layer1_hillshade_attr],
                preload: preload ? 16 : 0,
                maxZoom: 16,
                crossOrigin: null
            })
        });
        layers.push(tileLayer1_hillshade);
    }
    if (map_layer2_url) {
        tileLayer2_main = new ol.layer.Tile({
            source: new ol.source.XYZ({
                url: map_layer2_url,
                attributions: [map_layer2_attr],
                crossOrigin: null
            }),
            preload: preload ? 17 : 0
        });
        layers.push(tileLayer2_main);
    }

    // Karte erstellen
    const map = new ol.Map({
        target: 'mapid',
        layers: layers,
        controls: hideControls
            ? []
            : ol.control
                  .defaults({ attribution: false })
                  .extend([
                      control_attribution,
                      control_fullscreen,
                      new control_center(),
                      map_layer2_url ? new control_switchMap() : undefined
                  ]),
        view: map_view
    });
    map_instance = map;

    // Move Event
    map.on('moveend', function (e) {
        map_moved = true;
    });

    // Karte zentrieren
    if (center) {
        map_position = [dest.lng, dest.lat];
        map_center = () => {
            const view = map.getView();
            //view.setZoom(11);
            view.setCenter(ol.proj.transform(map_position, 'EPSG:4326', 'EPSG:3857'));
            map_moved = false;
            setTimeout(function () {
                map_moved = false;
            }, 50);
            console.log('MAP CENTER (Standard)', map_position, map_moved);
        };
        map_center();
    }

    // Layer 2 ausblenden
    setTimeout(function () {
        map_moved = false;
        if (tileLayer2_main) tileLayer2_main.setVisible(false);
    }, 1500);

    // Popups hinzufügen
    map_add_markerPopup(map);

    return map;
}
