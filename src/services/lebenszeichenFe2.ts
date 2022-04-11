'use strict';

import { SocketInfo } from '../websocket';
import config from '../utils/config';
import fs from 'fs';
import globalEvents from '../utils/globalEvents';
import logging from '../utils/logging';
import mqtt from 'mqtt';

const NAMESPACE = 'LebenszeichenFe2_Service';

class LebenszeichenFe2 {
    private last = '2020-01-01 00:00';
    private next = '2020-01-01 00:00';
    private info_sendt = false;

    public init() {
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
                clientId: 'FWmonitor_LebenszeichenFe2_' + Math.random().toString(16).substr(2, 8),
                clean: true,
                connectTimeout: 4000,
                username: config.mqtt_broker.internalUser,
                password: config.mqtt_broker.internalPassword,
                reconnectPeriod: 1000
            });

            const topic = config.mqtt_broker.topic_fe2_lebenszeichen || '';
            client.on('connect', () => {
                logging.info(NAMESPACE, 'Connected');
                client.subscribe([topic], () => {
                    logging.info(NAMESPACE, `Subscribe to topic '${topic}'`);
                });
            });

            client.on('message', (topic, payload) => {
                logging.debug(NAMESPACE, 'Received Message: ' + topic + ' - ' + payload.toString());
                this.parseMqttLebenszeichen(payload.toString());
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

        setInterval(() => {
            this.update();
        }, 60000);

        const next = new Date();
        next.setTime(
            next.getTime() + config.mqtt_broker.topic_fe2_lebenszeichen_startdelay * 60 * 1000
        );
        this.next = next.toString();
    }

    private parseFe2LebenszeichenDate(str: string) {
        str = str.substring(str.indexOf(': ') + 2).trim();
        const tmp = str.split('-');
        const time = tmp[1].trim();
        const date = tmp[0].trim().split('.');
        let ret = date[2] + '-' + date[1] + '-' + date[0] + ' ' + time;
        if (time.split(':').length < 3) ret += ':00';
        return ret;
    }

    private parseMqttLebenszeichen(str: string) {
        try {
            const data = str.split('\n');
            this.last = this.parseFe2LebenszeichenDate(data[0]);
            this.next = this.parseFe2LebenszeichenDate(data[1]);

            if (this.info_sendt) {
                globalEvents.emit('softwareinfo', 'FE2 Lebenszeichen OK');
            }
            this.info_sendt = false;
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
    }

    private update() {
        const now = new Date();
        const next = new Date(this.next);
        next.setMinutes(next.getMinutes() + 5);

        if (now > next && !this.info_sendt) {
            this.info_sendt = true;
            globalEvents.emit('softwareinfo', 'FE2 Lebenszeichen Fehler');
        }
    }

    public getStatusinfo() {
        const now = new Date();
        const next = new Date(this.next);
        next.setTime(next.getTime() + 1 * 60 * 1000);

        const fe2: SocketInfo = {
            type: 'Status',
            id: '0',
            name: 'Verbindung FE2',
            info: next > now ? 'Lebenszeichen OK' : 'Lebenszeichen Fehler',
            actions: [
                {
                    id: -2,
                    key: 'Letztes Lebenszeichen',
                    value: this.last
                },
                {
                    id: -1,
                    key: 'Nächstes Lebenszeichen',
                    value: this.next
                }
            ]
        };

        return fe2;
    }
}

export default new LebenszeichenFe2();
