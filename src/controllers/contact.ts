'use strict';

import { Request, Response, NextFunction } from 'express';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import { instance as DeviceServiceInstance, init, DeviceService } from '../services/device';
import logging from '../utils/logging';
import { checkValidation } from './controller';
import { Contact, contactService } from '../services/contact';

const NAMESPACE = 'ContactController';

class AlarmController {
    public async get_all(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_all');

        const response = await contactService.get_contacts_all();

        if (!response) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Error');
        }

        res.send(response);
    }
}

export default new AlarmController();
