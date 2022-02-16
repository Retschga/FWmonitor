'use strict';

import { Request, Response } from 'express';

import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import { contactService } from '../services/contact';
import logging from '../utils/logging';

const NAMESPACE = 'Contact_Controller';

class AlarmController {
    /**
     * Findet allen Kontakte
     */
    public async get_all(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_all');

        const response = await contactService.get_contacts_all();

        if (!response) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Error');
        }

        res.send(response);
    }
}

export default new AlarmController();
