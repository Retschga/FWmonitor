'use strict';

import express from 'express';
import alarmController from '../../controllers/alarm';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import * as ValidatorAlarm from '../../middleware/alarmValidator';

const router = express.Router();

router.get(
    '/list',
    ValidatorAlarm.getList,
    awaitHandlerFactory(alarmController.get_list.bind(alarmController))
);
router.get('/', awaitHandlerFactory(alarmController.get_last.bind(alarmController)));
router.get('/:id', awaitHandlerFactory(alarmController.get_id.bind(alarmController)));

export = router;
