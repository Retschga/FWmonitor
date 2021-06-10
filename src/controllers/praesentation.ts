'use strict';

import { Request, Response, NextFunction } from 'express';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import PraesentationService from '../services/praesentation';
import logging from '../utils/logging';

const NAMESPACE = 'PraesentationController';

class DiashowController {
    public async get_list(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_list');

        let filelist = await PraesentationService.get_list();
        if (!filelist) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Files found');
        }
        res.send(filelist);
    }
}

export default new DiashowController();
