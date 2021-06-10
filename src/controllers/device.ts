'use strict';

import { Request, Response, NextFunction } from 'express';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import { instance as DeviceServiceInstance, init, DeviceService } from '../services/device';
import logging from '../utils/logging';
import { checkValidation } from './controller';

const NAMESPACE = 'Alarm_Controller';

class AlarmController {
    public async get_all(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_all');

        if (!DeviceServiceInstance) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Error');
        }

        const reponse = DeviceServiceInstance.get_all();

        res.send(reponse);
    }

    public async get_praesentation(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_praesentation');

        if (!DeviceServiceInstance) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Error');
        }

        const reponse = DeviceServiceInstance.get_praesentation();

        res.send(reponse);
    }

    public async send_action(req: Request, res: Response, next: NextFunction) {
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

    public async start_praesentation(req: Request, res: Response, next: NextFunction) {
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

    public async send_action_praesentation(req: Request, res: Response, next: NextFunction) {
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
