'use strict';

import { Request, Response, NextFunction } from 'express';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import DiashowService from '../services/diashow';
import logging from '../utils/logging';
import { checkValidation } from './controller';

const NAMESPACE = 'DiashowController';

class DiashowController {
    public async get_list(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_list');

        let filelist = await DiashowService.get_list();
        if (!filelist) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No pictures found');
        }
        res.send(filelist);
    }

    public async enable_pic(req: Request, res: Response, next: NextFunction) {
        checkValidation(req);

        try {
            await DiashowService.enable_pic(String(req.body.filename));
        } catch (error) {
            logging.exception(NAMESPACE, error);
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Picture not disabled');
        }
        res.send('OK');
    }

    public async disable_pic(req: Request, res: Response, next: NextFunction) {
        checkValidation(req);

        try {
            await DiashowService.disable_pic(String(req.body.filename));
        } catch (error) {
            logging.exception(NAMESPACE, error);
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Picture not enabled');
        }
        res.send('OK');
    }

    public async delete_pic(req: Request, res: Response, next: NextFunction) {
        checkValidation(req);

        try {
            await DiashowService.delete_pic(String(req.body.filename));
        } catch (error) {
            logging.exception(NAMESPACE, error);
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Picture not deleted');
        }
        res.send('OK');
    }
}

export default new DiashowController();
