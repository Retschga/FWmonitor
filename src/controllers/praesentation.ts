'use strict';

import { Request, Response } from 'express';
import PraesentationService from '../services/praesentation';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import logging from '../utils/logging';

const NAMESPACE = 'Praesentation_Controller';

class DiashowController {
    /**
     * Liste aller verfügbaren Präsentationen
     */
    public async get_list(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_list');

        const filelist = await PraesentationService.get_list();
        if (!filelist) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Files found');
        }

        res.send(filelist);
    }
}

export default new DiashowController();
