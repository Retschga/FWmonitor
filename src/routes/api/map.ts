'use strict';

import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import express from 'express';
import mapController from '../../controllers/map';
//import apicache from 'apicache';

const router = express.Router();
//const cache = apicache.middleware;

router.get(
    '/layerurls',
    //cache('60 minutes'),
    awaitHandlerFactory(mapController.get_latlng.bind(mapController))
);

export = router;
