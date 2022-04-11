'use strict';

import { AlarmRow } from '../models/alarm';
import alarmService from './alarm';
import config from '../utils/config';
import fs from 'fs';
import geocodeService from './geocode';
import globalEvents from '../utils/globalEvents';
import logging from '../utils/logging';
import mqtt from 'mqtt';

const NAMESPACE = 'AlarmInputFE2_Service';

class AlarmInputFE2Service {
    constructor() {
        return;
    }

    public async init() {
        // connect mqtt
        try {
            const CA =
                config.mqtt_broker.cert && !config.mqtt_broker.internalBroker
                    ? fs.readFileSync(config.mqtt_broker.ca || '')
                    : undefined;
            logging.info(NAMESPACE, 'Connecting to ' + config.mqtt_broker.hostname);
            const client = mqtt.connect({
                host: config.mqtt_broker.hostname,
                protocol: 'mqtts',
                port: Number(config.mqtt_broker.port),
                ca: CA,
                rejectUnauthorized: !config.mqtt_broker.internalBroker,
                clientId: 'FWmonitor_AlarmInputFE2_' + Math.random().toString(16).substr(2, 8),
                clean: true,
                connectTimeout: 4000,
                username: config.mqtt_broker.internalUser,
                password: config.mqtt_broker.internalPassword,
                reconnectPeriod: 1000
            });

            const topic = config.mqtt_broker.topic_fe2_alarm || '';
            client.on('connect', () => {
                logging.info(NAMESPACE, 'Connected');
                client.subscribe([topic], () => {
                    logging.info(NAMESPACE, `Subscribe to topic '${topic}'`);
                });
            });

            client.on('message', (topic, payload) => {
                logging.debug(NAMESPACE, 'Received Message: ' + topic + ' - ' + payload.toString());
                this.parseMqttAlarm(payload.toString());
            });
            client.on('close', () => {
                logging.debug(NAMESPACE, 'close');
            });
            client.on('disconnect', () => {
                logging.debug(NAMESPACE, 'disconnect');
            });
            client.on('offline', () => {
                logging.debug(NAMESPACE, 'offline');
            });
            client.on('error', (err) => {
                logging.error(NAMESPACE, 'error: ' + err.name + ' - ' + err.message);
            });
            client.on('end', () => {
                logging.debug(NAMESPACE, 'end');
            });
        } catch (error) {
            logging.error(NAMESPACE, String(error));
            logging.exception(NAMESPACE, error);
        }
    }

    private parseFe2AlarmDate(str: string) {
        const tmp = str.split(' ');
        const time = tmp[1].trim();
        const date = tmp[0].trim().split('.');
        let ret = date[2] + '-' + date[1] + '-' + date[0] + ' ' + time;
        if (time.split(':').length < 3) ret += ':00';
        return ret;
    }

    private async parseMqttAlarm(str: string) {
        const data = JSON.parse(str);

        const alarmRow: AlarmRow = {
            id: undefined,
            einsatznummer: '',
            date: '',

            objekt: '',
            lat: '',
            lng: '',
            strasse: '',
            ortsteil: '',
            ort: '',
            kreuzung: '',
            isAddress: false,

            tetra: '',

            cars1: '',
            cars2: '',

            einsatzstichwort: '',
            schlagwort: '',
            prio: '',

            mitteiler: '',
            rufnummer: '',

            bemerkung: '',

            hinweis: '',
            patient: '',
            einsatzplan: ''
        };

        const eMID_Operation_Nr = data['parameters']['eMID_Operation_Nr'];
        if (eMID_Operation_Nr) alarmRow.einsatznummer = eMID_Operation_Nr;

        const eMID_Alarm_Date = data['parameters']['eMID_Alarm_Date'];
        if (eMID_Alarm_Date) alarmRow.date = this.parseFe2AlarmDate(eMID_Alarm_Date);

        const street = data['parameters']['street'];
        if (street) alarmRow.strasse = street;
        const house = data['parameters']['house'];
        if (house) alarmRow.strasse += ' ' + house;
        const postalCode = data['parameters']['postalCode'];
        const city = data['parameters']['city'];
        if (city) alarmRow.ort = city;
        const location_dest = data['parameters']['location_dest'];
        const eMID_location_dest = data['parameters']['eMID_location_dest'];
        const eMID_location_dest_temp = eMID_location_dest && eMID_location_dest.split(',');
        const eMID_location_dest_ortsteil =
            eMID_location_dest_temp && eMID_location_dest_temp[1]?.trim().split(' ')[1];
        if (eMID_location_dest_ortsteil) alarmRow.ortsteil = eMID_location_dest_ortsteil;

        const einsatzort_objekt = data['parameters']['einsatzort_objekt'];
        if (einsatzort_objekt) alarmRow.objekt = einsatzort_objekt;
        const building = data['parameters']['building'];
        if (building) alarmRow.objekt = building;

        const eMID_TETRA = data['parameters']['eMID_TETRA'];
        if (eMID_TETRA) alarmRow.tetra = eMID_TETRA;

        const einsatzmittel = data['parameters']['einsatzmittel'];
        const eMID_einsatzmittelAlle = data['parameters']['eMID_einsatzmittelAlle'];
        const eMID_Dienststellen = data['parameters']['eMID_Dienststellen'];

        let cars_all = '';
        const cars_1: string[] = [];
        const cars_2: string[] = [];
        if (einsatzmittel) cars_all = einsatzmittel;
        if (eMID_einsatzmittelAlle) cars_all = eMID_einsatzmittelAlle;
        if (eMID_Dienststellen) cars_all = eMID_Dienststellen + '\n' + cars_all;

        const cars = cars_all.split('\n');
        for (const i in cars) {
            const regex = RegExp(config.alarmfields.CAR1, 'gi');

            if (regex.test(cars[i])) cars_1.push(cars[i]);
            else cars_2.push(cars[i]);
        }
        alarmRow.cars1 = cars_1.join('|');
        alarmRow.cars2 = cars_2.join('|');

        let abek = data['parameters']['abek']; // #B1024#im Freien#Kleinbrand
        if (abek) {
            abek = abek.substr(2);
            abek = abek.substr(abek.search('#'));
            abek = abek.replace(/#/g, ' ');
            alarmRow.schlagwort = abek;
        }
        const eMID_keyword = data['parameters']['eMID_keyword']; // B 1
        if (eMID_keyword) alarmRow.einsatzstichwort = eMID_keyword;
        const eMID_Stichwörter = data['parameters']['eMID_Stichwörter']; // B 1

        const eMID_Priority = data['parameters']['eMID_Priority'];
        if (eMID_Priority) alarmRow.prio = eMID_Priority;

        const caller = data['parameters']['caller'];
        if (caller) alarmRow.mitteiler = caller;
        const caller_contact = data['parameters']['caller_contact'];
        if (caller_contact) alarmRow.rufnummer = caller_contact;

        const eMID_message = data['parameters']['eMID_message'];
        if (eMID_message) alarmRow.bemerkung = eMID_message;

        const einsatzplannummer = data['parameters']['einsatzplannummer'];
        if (einsatzplannummer) alarmRow.einsatzplan = einsatzplannummer;

        const lat = data['parameters']['lat'];
        if (lat) alarmRow.lat = lat;
        const lng = data['parameters']['lng'];
        if (lng) alarmRow.lng = lng;
        if (lat && lng) {
            alarmRow.isAddress = true;
        } else {
            // Geocoding
            let geoData = { lat: '0', lng: '0', isAddress: false };
            try {
                geoData = await geocodeService.geocode(alarmRow);
                alarmRow.lat = geoData.lat;
                alarmRow.lng = geoData.lng;
                alarmRow.isAddress = geoData.isAddress;
            } catch (error) {
                logging.exception(NAMESPACE, error);
            }
        }

        const alarmState = data['parameters']['alarmState'];
        const changeReason = data['parameters']['changeReason'];
        if (alarmState && changeReason && alarmState == 'UPDATE') {
            globalEvents.emit('alarm-update', changeReason);
        }

        // Alarm speichern
        alarmService.createOrUpdate(alarmRow);
    }
}

export default new AlarmInputFE2Service();
