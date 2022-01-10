'use strict';

import express from 'express';
import hydrantController from '../../controllers/hydrant';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
//import apicache from 'apicache';

const router = express.Router();
//const cache = apicache.middleware;

router.get(
    '/:lat/:lng',
    //cache('60 minutes'),
    awaitHandlerFactory(hydrantController.get_latlng.bind(hydrantController))
);

export = router;
