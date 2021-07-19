'use strict';

import { Request, Response } from 'express';
import { checkValidation } from './controller';
import DiashowService from '../services/diashow';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import logging from '../utils/logging';

const NAMESPACE = 'Diashow_Controller';

class DiashowController {
    /**
     * Eine Liste aller Bilder (Dateinamen)
     */
    public async get_list(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_list');

        const filelist = await DiashowService.get_list();
        if (!filelist) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No pictures found');
        }
        res.send(filelist);
    }

    /**
     * Aktiviert ein Bild
     */
    public async enable_pic(req: Request, res: Response) {
        checkValidation(req);

        try {
            await DiashowService.enable_pic(String(req.body.filename));
        } catch (error) {
            logging.exception(NAMESPACE, error);
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Picture not disabled');
        }

        res.send('OK');
    }

    /**
     * Deaktiviert ein Bild
     */
    public async disable_pic(req: Request, res: Response) {
        checkValidation(req);

        try {
            await DiashowService.disable_pic(String(req.body.filename));
        } catch (error) {
            logging.exception(NAMESPACE, error);
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Picture not enabled');
        }

        res.send('OK');
    }

    /**
     * Löscht ein Bild
     */
    public async delete_pic(req: Request, res: Response) {
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
