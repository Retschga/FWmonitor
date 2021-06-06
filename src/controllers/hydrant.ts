'use strict';

import { Request, Response, NextFunction } from 'express';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import HydrantService from '../services/hydrant';
import logging from '../utils/logging';
import { checkValidation } from './controller';

const NAMESPACE = 'HydrantController';

class HydrantController {
    public async get_latlng(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_lnglat');

        let list = await HydrantService.find_latlng(
            String(req.params.lat).replace(/%2E/g, '.'),
            String(req.params.lng).replace(/%2E/g, '.')
        );
        if (!list || list.length < 1) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No hydrants not found');
        }
        res.send(list);
    }
}

export default new HydrantController();
