'use strict';

import express from 'express';
import deviceController from '../../controllers/device';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import * as deviceValidator from '../../middleware/deviceValidator';

const router = express.Router();

router.get('/all', awaitHandlerFactory(deviceController.get_all.bind(deviceController)));
router.post(
    '/:id/action',
    deviceValidator.send_action,
    awaitHandlerFactory(deviceController.send_action.bind(deviceController))
);

export = router;
