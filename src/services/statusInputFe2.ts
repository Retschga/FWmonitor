'use strict';

import CarService from '../services/car';
import config from '../utils/config';
import fs from 'fs';
import globalEvents from '../utils/globalEvents';
import logging from '../utils/logging';
import mqtt from 'mqtt';

const NAMESPACE = 'StatusInputFe2_Service';

class StatusInputFe2 {
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
                clientId: 'FWmonitor_StatusInputFe2_' + Math.random().toString(16).substr(2, 8),
                clean: true,
                connectTimeout: 4000,
                username: config.mqtt_broker.internalUser,
                password: config.mqtt_broker.internalPassword,
                reconnectPeriod: 1000
            });

            const topic = config.mqtt_broker.topic_fe2_status;
            client.on('connect', () => {
                logging.info(NAMESPACE, 'Connected');
                client.subscribe([topic], () => {
                    logging.info(NAMESPACE, `Subscribe to topic '${topic}'`);
                });
            });

            client.on('message', (topic, payload) => {
                logging.debug(NAMESPACE, 'Received Message: ' + topic + ' - ' + payload.toString());
                this.parseMqttStatus(payload.toString());
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

    public async parseMqttStatus(str: string) {
        const list = await CarService.find();
        if (!list) return;
        logging.info(NAMESPACE, str);

        for (let i = 0; i < list.length; i++) {
            const car = list[i];
            if (car.funk_name != '' && str.indexOf(car.funk_name) != -1) {
                if (str.indexOf('Wechsel auf Status 0') != -1) {
                    // Sprechwunsch dringend
                    const lastStatus = car.funk_status;
                    globalEvents.emit('car_status-change', car.funk_name + '|' + 0);
                    CarService.update_FunkStatus(car.id, '0');
                    setTimeout(() => {
                        globalEvents.emit('car_status-change', car.funk_name + '|' + lastStatus);
                        CarService.update_FunkStatus(car.id, lastStatus, false);
                    }, 5000);
                }
                if (str.indexOf('Wechsel auf Status 1') != -1) {
                    // Einsatzbereit über Funk
                    globalEvents.emit('car_status-change', car.funk_name + '|' + 1);
                    CarService.update_FunkStatus(car.id, '1');
                }
                if (str.indexOf('Wechsel auf Status 2') != -1) {
                    // Einsatzbereit auf Wache
                    globalEvents.emit('car_status-change', car.funk_name + '|' + 2);
                    CarService.update_FunkStatus(car.id, '2');
                }
                if (str.indexOf('Wechsel auf Status 3') != -1) {
                    // Einsatz übernommen
                    globalEvents.emit('car_status-change', car.funk_name + '|' + 3);
                    CarService.update_FunkStatus(car.id, '3');
                }
                if (str.indexOf('Wechsel auf Status 4') != -1) {
                    // Am Einsatzort
                    globalEvents.emit('car_status-change', car.funk_name + '|' + 4);
                    CarService.update_FunkStatus(car.id, '4');
                }
                if (str.indexOf('Wechsel auf Status 5') != -1) {
                    // Sprechwunsch
                    const lastStatus = car.funk_status;
                    globalEvents.emit('car_status-change', car.funk_name + '|' + 5);
                    CarService.update_FunkStatus(car.id, '5');
                    setTimeout(() => {
                        globalEvents.emit('car_status-change', car.funk_name + '|' + lastStatus);
                        CarService.update_FunkStatus(car.id, lastStatus, false);
                    }, 5000);
                }
                if (str.indexOf('Wechsel auf Status 6') != -1) {
                    // Fahrzeug nicht einsatzbereit
                    globalEvents.emit('car_status-change', car.funk_name + '|' + 6);
                    CarService.update_FunkStatus(car.id, '6');
                }
                if (str.indexOf('Wechsel auf Status C') != -1) {
                    // Sprechwunsch
                    const lastStatus = car.funk_status;
                    globalEvents.emit('car_status-change', car.funk_name + '|C');
                    CarService.update_FunkStatus(car.id, 'C');
                    setTimeout(() => {
                        globalEvents.emit('car_status-change', car.funk_name + '|' + lastStatus);
                        CarService.update_FunkStatus(car.id, lastStatus, false);
                    }, 10000);
                }
                if (str.indexOf('Wechsel auf Status J') != -1) {
                    // Sprechwunsch
                    const lastStatus = car.funk_status;
                    globalEvents.emit('car_status-change', car.funk_name + '|J');
                    CarService.update_FunkStatus(car.id, 'J');
                    setTimeout(() => {
                        globalEvents.emit('car_status-change', car.funk_name + '|' + lastStatus);
                        CarService.update_FunkStatus(car.id, lastStatus, false);
                    }, 10000);
                }
                if (str.indexOf('Wechsel auf Status F') != -1) {
                    // Sprechwunsch
                    const lastStatus = car.funk_status;
                    globalEvents.emit('car_status-change', car.funk_name + '|F');
                    CarService.update_FunkStatus(car.id, 'F');
                    setTimeout(() => {
                        globalEvents.emit('car_status-change', car.funk_name + '|' + lastStatus);
                        CarService.update_FunkStatus(car.id, lastStatus, false);
                    }, 10000);
                }
            }
        }
    }
}

export default new StatusInputFe2();
