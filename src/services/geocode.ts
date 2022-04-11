'use strict';

import { AlarmRow } from '../models/alarm';
import axios from 'axios';
import config from '../utils/config';
import csv from 'csv-parser';
import diffmatch from '../utils/diff_match_patch.utils';
import fs from 'fs';
import logging from '../utils/logging';

const NAMESPACE = 'Geocode_Service';

class GeocodeService {
    private async geocode_bing(alarmRow: AlarmRow): Promise<{ lat: string; lng: string }> {
        if (!config.geocode.bing_apikey) throw new Error('kein GeoBing API Key angegeben');

        const geobingUrl = encodeURI(
            `http://dev.virtualearth.net/REST/v1/Locations?countryRegion=${config.geocode.iso_country}&&key=${config.geocode.bing_apikey}&locality=${alarmRow.ort}&addressLine=${alarmRow.strasse}`
        );

        logging.debug(NAMESPACE + ' geocode_bing', geobingUrl);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response: any = await axios.get(geobingUrl);

        logging.debug(NAMESPACE + ' geocode_bing', JSON.stringify(response.data));

        const coordinates = response.data.resourceSets[0]?.resources[0]?.point?.coordinates;
        return { lat: coordinates[0], lng: coordinates[1] };
    }

    private async geocode_overpass(ORT: string, OBJEKT: string) {
        const ret = { lat: '0', lng: '0', isAddress: false };

        if (OBJEKT == '') return ret;

        // Objekt Substring
        OBJEKT = OBJEKT.substring(OBJEKT.indexOf(' '));
        OBJEKT = OBJEKT.substring(OBJEKT.indexOf(' '));

        // Charakter ersetzen
        OBJEKT = OBJEKT.replace(/1/g, 'l');

        // Overpass Objektabfrage
        logging.debug(NAMESPACE, 'Durchsuche OSM Gebaude und Objekte');
        const overpassObjektUrl = encodeURI(
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
                ');out body center;'
        );

        logging.debug(NAMESPACE + ' geocode_overpass', overpassObjektUrl);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response: any = await axios.get(overpassObjektUrl);

        const csvDat = response.data.split('\n');

        for (let i = 0; i < csvDat.length; i++) {
            const dmp = new diffmatch();
            dmp.Match_Distance = 100000000;
            dmp.Match_Threshold = 0.3;

            if (csvDat[i] != '') {
                const linearr = csvDat[i].split('|');
                for (let j = 2; j <= 3; j++) {
                    if (linearr[j] != undefined) {
                        const pattern = linearr[j].substring(0, 31);
                        const match = dmp.match_main(OBJEKT, pattern, 0);
                        if (match != -1) {
                            const quote = OBJEKT.substring(match, match + pattern.length);
                            logging.debug(NAMESPACE, 'Match: ' + csvDat[i] + '  --> ' + quote);

                            ret.lat = linearr[0];
                            ret.lng = linearr[1];
                            ret.isAddress = true;
                        }
                    }
                }
            }
        }

        logging.debug(NAMESPACE + ' geocode_overpass', JSON.stringify(ret));

        return ret;
    }

    private geocode_bahn(OBJEKT: string) {
        return new Promise((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const results: any[] = [];
            const s1 = OBJEKT.split(' ');
            const s = s1[s1.length - 1];

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

    private async geocode_nominatim(alarmRow: AlarmRow) {
        const url = encodeURI(
            'https://nominatim.openstreetmap.org/search' +
                '?useragent=FWmonitor' +
                '&referer=https://github.com/Retschga/FWmonitor' +
                '&format=json' +
                '&country=DE' +
                '&city=' +
                alarmRow.ort +
                '&street=' +
                alarmRow.strasse
        );

        logging.debug(NAMESPACE + ' geocode_nominatim', url);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response: any = await axios.get(url);

        logging.debug(NAMESPACE + ' geocode_nominatim', JSON.stringify(response.data));

        return response;
    }

    public async geocode(alarmRow: AlarmRow) {
        let ret = { lat: '0', lng: '0', isAddress: alarmRow.isAddress };
        let isHighway = false;

        // Prio 1: Prüfe Bahnübergänge
        if (config.geocode.bahn) {
            if (alarmRow.objekt.toLowerCase().indexOf('bahn') != -1) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const response_bahn: any = await this.geocode_bahn(alarmRow.objekt);

                    if (response_bahn) {
                        ret.lat = response_bahn['GEOGR_BREITE'].replace(',', '.');
                        ret.lng = response_bahn['GEOGR_LAENGE'].replace(',', '.');
                        ret.isAddress = true;
                        logging.debug(NAMESPACE + 'BAHN', 'Ergebnis: Bahnübergang ', ret);
                        if (ret.lat != '0') return ret;
                    }
                } catch (error) {
                    logging.exception(NAMESPACE + 'BAHN', error);
                }
            }
        }

        // Prio 2: OSM Objektsuche
        if (config.geocode.osm_objects) {
            if (!ret.isAddress && !isHighway) {
                try {
                    const response_overpass = await this.geocode_overpass(
                        alarmRow.ort,
                        alarmRow.objekt
                    );

                    if (response_overpass.isAddress) {
                        logging.debug(NAMESPACE + ' OSM', 'Ergebnis: OSM Objekt ', ret);
                        ret = response_overpass;
                        if (ret.lat != '0') return ret;
                    }
                } catch (error) {
                    logging.exception(NAMESPACE + ' OSM', error);
                }
            }
        }

        // Prio 3: OSM Nominatim
        if (config.geocode.osm_nominatim) {
            try {
                const response_nominatim = await this.geocode_nominatim(alarmRow);

                logging.debug(NAMESPACE + ' Nominatim', response_nominatim);

                /*if (
                    response_nominatim.length > 0 &&
                    (response_nominatim[0].class == 'place' ||
                        response_nominatim[0].class == 'tourism')
                ) {
                    ret.lat = response_nominatim[0].lat;
                    ret.lng = response_nominatim[0].lon;
                    ret.isAddress = true;

                    logging.debug(NAMESPACE + ' Nominatim', 'Ergebnis: Nominatim Adresse ', ret);
                    if (ret.lat != '0') return ret;
                }*/

                if (
                    response_nominatim.length > 0 &&
                    (response_nominatim[0].class == 'highway' ||
                        response_nominatim[0].class == 'footway' ||
                        response_nominatim[0].class == 'sidewalk' ||
                        response_nominatim[0].class == 'cycleway') &&
                    !alarmRow.isAddress
                ) {
                    ret.lat = response_nominatim[0].lat;
                    ret.lng = response_nominatim[0].lon;
                    ret.isAddress = false;
                    isHighway = true;

                    logging.debug(NAMESPACE + ' Nominatim', 'Ergebnis: Strasse ', ret);
                    if (ret.lat != '0') return ret;
                } else {
                    ret.lat = response_nominatim[0].lat;
                    ret.lng = response_nominatim[0].lon;
                    ret.isAddress = true;

                    logging.debug(NAMESPACE + ' Nominatim', 'Ergebnis: Nominatim Adresse ', ret);
                    if (ret.lat != '0') return ret;
                }
            } catch (error) {
                logging.exception(NAMESPACE + ' Nominatim', error);
            }
        }

        // Prio 4: Bing Geocode
        if (config.geocode.bing) {
            try {
                const response_bing = await this.geocode_bing(alarmRow);
                logging.debug(
                    NAMESPACE + ' BING',
                    'lat: ' + response_bing.lat + '  lng: ' + response_bing.lng
                );
                ret.lat = response_bing.lat;
                ret.lng = response_bing.lng;

                logging.debug(NAMESPACE, 'Ergebnis: GeoBing Adresse ', ret);
                if (ret.lat != '0') return ret;
            } catch (error) {
                logging.exception(NAMESPACE, error);
            }
        }

        return { lat: '', lng: '', isAddress: false };
    }
}

export default new GeocodeService();
