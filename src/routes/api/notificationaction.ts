'use strict';

import express from 'express';
import alarmController from '../../controllers/alarm';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import * as ValidatorAlarm from '../../middleware/alarmValidator';

const router = express.Router();

router.post(
    '/userstatus/:id',
    ValidatorAlarm.updateUserstatus,
    awaitHandlerFactory(alarmController.update_userstatus.bind(alarmController))
);
export = router;
