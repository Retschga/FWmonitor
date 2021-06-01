'use strict';

import { Request, Response, NextFunction } from 'express';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import { instance as DeviceServiceInstance, init, DeviceService } from '../services/device';
import logging from '../utils/logging';
import { checkValidation } from './controller';

const NAMESPACE = 'Alarm_Controller';

class AlarmController {
    // Alarm

    public async get_all(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_all');

        if (!DeviceServiceInstance) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Error');
        }

        const reponse = DeviceServiceInstance.get_all();

        res.send(reponse);
    }
}

export default new AlarmController();
