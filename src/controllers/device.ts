'use strict';

import { Request, Response } from 'express';
import { checkValidation } from './controller';
import { instance as DeviceServiceInstance } from '../services/device';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
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

        const reponse = DeviceServiceInstance.get_all();

        res.send(reponse);
    }

    /**
     * Findet alle verbundenen Geräte, die Präsentationen können
     */
    public async get_praesentation(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_praesentation');

        if (!DeviceServiceInstance) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Error');
        }

        const reponse = DeviceServiceInstance.get_praesentation();

        res.send(reponse);
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

        const reponse = DeviceServiceInstance.send_action(
            String(req.params.id),
            Number(req.body.action),
            String(req.body.value)
        );

        res.send(reponse);
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

        const reponse = DeviceServiceInstance.send_action(
            String(req.params.id),
            4,
            JSON.stringify({ action: 'start', file: String(req.body.file) })
        );

        res.send(reponse);
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

        const reponse = DeviceServiceInstance.send_action(
            String(req.params.id),
            4,
            JSON.stringify({ action: action })
        );

        res.send(reponse);
    }
}

export default new AlarmController();
