'use strict';

import axios from 'axios';
//@ts-ignore
import geobing from 'geobing';
//@ts-ignore
import Nominatim from 'nominatim-geocoder';
const nominatim = new Nominatim();
import csv from 'csv-parser';
import fs from 'fs';
import logging from '../utils/logging';
import config from '../utils/config';
import diffmatch from '../utils/diff_match_patch.utils';

const NAMESPACE = 'GeocodeService';

class GeocodeService {
    constructor() {
        geobing.setKey(config.geocode.bing_apikey);
    }

    private geocode_bing(searchString: string): Promise<{ lat: string; lng: string }> {
        return new Promise((resolve, reject) => {
            geobing.getCoordinates(searchString, function (err: any, coordinates: any) {
                if (err) reject(err);
                resolve({ lat: coordinates.lat, lng: coordinates.lng });
            });
        });
    }

    private async geocode_overpass(ORT: string, OBJEKT: string) {
        let ret = { lat: '0', lng: '0', isAddress: false };

        if (OBJEKT == '') return ret;

        // Objekt Substring
        OBJEKT = OBJEKT.substring(OBJEKT.indexOf(' '));
        OBJEKT = OBJEKT.substring(OBJEKT.indexOf(' '));

        // Charakter ersetzen
        OBJEKT = OBJEKT.replace(/1/g, 'l');

        // Overpass Objektabfrage
        logging.debug(NAMESPACE, 'Durchsuche OSM Gebaude und Objekte');
        var overpassObjektUrl =
            'http://overpass-api.de/api/interpreter?data=' +
            '[out:csv(::lat, ::lon, name; false; "|")][timeout:25];' +
            'area[admin_level][name="' +
            ORT +
            '"]->.searchArea; (' +
            'node["building"]["name"](area.searchArea);' +
            'way["building"]["name"](area.searchArea);' +
            'relation["building"]["name"](area.searchArea);' +
            'node["amenity"]["name"](area.searchArea);' +
            'way["amenity"]["name"](area.searchArea);' +
            'relation["amenity"]["name"](area.searchArea);' +
            ');out body center;';

        const response = await axios
            .get(overpassObjektUrl)
            .then((response) => {
                var csvDat = response.data.split('\n');

                for (var i = 0; i < csvDat.length; i++) {
                    var dmp = new diffmatch();
                    dmp.Match_Distance = 100000000;
                    dmp.Match_Threshold = 0.3;

                    if (csvDat[i] != '') {
                        var linearr = csvDat[i].split('|');
                        for (var j = 2; j <= 3; j++) {
                            if (linearr[j] != undefined) {
                                var pattern = linearr[j].substring(0, 31);
                                var match = dmp.match_main(OBJEKT, pattern, 0);
                                if (match != -1) {
                                    var quote = OBJEKT.substring(match, match + pattern.length);
                                    logging.debug(
                                        NAMESPACE,
                                        'Match: ' + csvDat[i] + '  --> ' + quote
                                    );

                                    ret.lat = linearr[0];
                                    ret.lng = linearr[1];
                                    ret.isAddress = true;
                                }
                            }
                        }
                    }
                }
            })
            .catch((err) => {
                console.error('[GeocodeManager] [Objektsuche] Fehler ', err);
            });

        return ret;
    }

    private geocode_bahn(OBJEKT: string) {
        return new Promise(async (resolve, reject) => {
            let results: any[] = [];
            let s1 = OBJEKT.split(' ');
            let s = s1[s1.length - 1];

            fs.createReadStream('bahnuebergaenge.csv')
                .pipe(csv({ separator: ';' }))
                .on('data', (data) => {
                    if (data['BEZEICHNUNG'].indexOf(s) != -1) {
                        results.push(data);
                    }
                })
                .on('end', () => {
                    logging.debug(NAMESPACE, 'results - bahn', results);
                    if (results.length == 1) {
                        logging.debug(NAMESPACE, 'Bahnübergang gefunden');
                        resolve(results[0]);
                    } else {
                        reject('Bahnübergang nicht gefunden');
                    }
                });
        });
    }

    public async geocode(searchString: string, isAddress: boolean, OBJEKT: string, ORT: string) {
        let ret = { lat: '0', lng: '0', isAddress: isAddress };
        let isHighway = false;

        // Prüfe Bahnübergänge
        if (config.geocode.bahn) {
            if (OBJEKT.toLowerCase().indexOf('bahn') != -1) {
                try {
                    const response_bahn: any = await this.geocode_bahn(OBJEKT);

                    logging.debug(NAMESPACE, 'Response', response_bahn);
                    if (response_bahn) {
                        ret.lat = response_bahn['GEOGR_BREITE'].replace(',', '.');
                        ret.lng = response_bahn['GEOGR_LAENGE'].replace(',', '.');
                        ret.isAddress = true;
                        logging.debug(NAMESPACE, 'Ergebnis: Bahnübergang ', ret);
                    }
                } catch (error) {
                    logging.ecxeption(NAMESPACE, error);
                }
            }
            if (ret.lat != '0') return ret;
        }

        // Bing Geocode
        if (config.geocode.bing) {
            try {
                const response_bing = await this.geocode_bing(searchString);
                logging.debug(NAMESPACE, 'lat: ' + response_bing.lat + 'lng: ' + response_bing.lng);
                ret.lat = response_bing.lat;
                ret.lng = response_bing.lng;
            } catch (error) {
                logging.ecxeption(NAMESPACE, error);
            }
        }

        // OSM Nominatim
        if (config.geocode.osm_nominatim) {
            try {
                const response_nominatim = await nominatim.search({ q: searchString });

                logging.debug(NAMESPACE, '[Nominatim] ', response_nominatim);

                if (response_nominatim.length > 0 && response_nominatim[0].class == 'place') {
                    ret.lat = response_nominatim[0].lat;
                    ret.lng = response_nominatim[0].lon;
                    ret.isAddress = true;

                    logging.debug(NAMESPACE, 'Benutze Nominatim Koordinaten');
                }

                if (
                    response_nominatim.length > 0 &&
                    response_nominatim[0].class == 'highway' &&
                    !isAddress
                ) {
                    ret.lat = response_nominatim[0].lat;
                    ret.lng = response_nominatim[0].lon;
                    ret.isAddress = false;
                    isHighway = true;

                    logging.debug(NAMESPACE, 'Benutze Nominatim Koordinaten');
                }
            } catch (error) {
                logging.ecxeption(NAMESPACE, error);
            }
        }

        // OSM Objektsuche
        if (config.geocode.osm_objects) {
            if (!ret.isAddress && !isHighway) {
                const response_overpass = await this.geocode_overpass(ORT, OBJEKT);

                if (response_overpass.isAddress) {
                    logging.debug(NAMESPACE, 'Benutze OSM Objekt Koordinaten');
                    ret = response_overpass;
                }
            }
        }

        return { lat: '', lng: '', isAddress: false };
    }
}

export default new GeocodeService();
