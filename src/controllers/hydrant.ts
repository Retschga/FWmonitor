'use strict';

import { Request, Response } from 'express';

import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import HydrantService from '../services/hydrant';
import logging from '../utils/logging';

const NAMESPACE = 'Hydrant_Controller';

class HydrantController {
    /**
     * Findet einen Hydranten anhand der Koordinaten
     */
    public async get_latlng(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_lnglat');

        const list = await HydrantService.find_latlng(
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
