'use strict';

import { Request, Response } from 'express';

import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import logging from '../utils/logging';
import maptiles from '../services/maptiles';

const NAMESPACE = 'MapController';

class MapController {
    /**
     * Gibt alle Karten-Urls zurück
     */
    public async get_latlng(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_lnglat');

        const list = maptiles.getLayerUrls();

        if (!list) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'Unknown Error');
        }

        res.json(list);
    }
}

export default new MapController();
