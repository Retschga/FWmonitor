'use strict';

import { Request, Response } from 'express';

import { instance as DeviceServiceInstance } from '../services/device';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import { SocketInfo } from '../websocket';
import { checkValidation } from './controller';
import config from '../utils/config';
import lebenszeichenFe2 from '../services/lebenszeichenFe2';
import logging from '../utils/logging';

const NAMESPACE = 'Alarm_Controller';

class AlarmController {
    /**
     * Findet alle verbundenen Geräte
     */
    public async get_all(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_all');

        if (!DeviceServiceInstance) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Error');
        }

        const sw: SocketInfo = {
            type: 'Version',
            id: '0',
            name: 'FWmonitor',
            info: config.version,
            actions: [
                {
                    id: -1,
                    key: 'Neue Version',
                    value: config.version_new
                }
            ]
        };

        // eslint-disable-next-line prefer-const
        let response = DeviceServiceInstance.get_all();
        if (config.mqtt_broker.topic_fe2_lebenszeichen)
            response.unshift(lebenszeichenFe2.getStatusinfo());
        response.unshift(sw);

        res.send(response);
    }

    /**
     * Findet alle verbundenen Geräte, die Präsentationen können
     */
    public async get_praesentation(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_praesentation');

        if (!DeviceServiceInstance) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Error');
        }

        const response = DeviceServiceInstance.get_praesentation();

        res.send(response);
    }

    /**
     * Sendet eine Aktion an das gewünschte Gerät
     */
    public async send_action(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'send_action');
        checkValidation(req);

        if (!DeviceServiceInstance) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Error');
        }

        const response = DeviceServiceInstance.send_action(
            String(req.params.id),
            Number(req.body.action),
            String(req.body.value)
        );

        res.send(response);
    }

    /**
     * Startet eine Präsentation am gewünschten Gerät
     */
    public async start_praesentation(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'start_praesentation');
        checkValidation(req);

        if (!DeviceServiceInstance) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Error');
        }

        const response = DeviceServiceInstance.send_action(
            String(req.params.id),
            4,
            JSON.stringify({ action: 'start', file: String(req.body.file) })
        );

        res.send(response);
    }

    /**
     * Sendet eine Präsentationssteuerung Aktion an das gewüschte Gerät
     */
    public async send_action_praesentation(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'send_action_praesentation');
        checkValidation(req);

        if (!DeviceServiceInstance) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Error');
        }

        let action = '';
        switch (String(req.body.action)) {
            case 'play':
                action = 'play';
                break;
            case 'stop':
                action = 'stop';
                break;
            case 'pause':
                action = 'pause';
                break;
            case 'page+':
                action = 'page+';
                break;
            case 'page-':
                action = 'page-';
                break;
        }

        const response = DeviceServiceInstance.send_action(
            String(req.params.id),
            4,
            JSON.stringify({ action: action })
        );

        res.send(response);
    }

    /**
     * Sende WebRTC Daten für Bildschirmübertragung
     */
    public async send_action_webrtc(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'send_action_webrtc');
        checkValidation(req);

        if (!DeviceServiceInstance) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Error');
        }

        if (Number(req.body.action) == 1) {
            const response1 = DeviceServiceInstance.send_action(
                String(req.params.id),
                15,
                JSON.stringify({ data: String(req.body.data) })
            );

            if (response1 != true) {
                res.send(response1);
                return;
            }
        }

        const response2 = DeviceServiceInstance.get_backchannel(String(req.params.id));

        res.send(response2 || []);
    }
}

export default new AlarmController();
