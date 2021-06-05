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

router.get(
    '/alarmsettings',
    awaitHandlerFactory(alarmController.get_alarmsettings.bind(alarmController))
);
router.post(
    '/alarmsettings/telegram',
    ValidatorAlarm.updateAlarmTelegram,
    awaitHandlerFactory(alarmController.update_alarmsettings_telegram.bind(alarmController))
);

router.post(
    '/alarmsettings/app',
    ValidatorAlarm.updateAlarmApp,
    awaitHandlerFactory(alarmController.update_alarmsettings_app.bind(alarmController))
);

router.post(
    '/userstatus/:id',
    ValidatorAlarm.updateUserstatus,
    awaitHandlerFactory(alarmController.update_userstatus.bind(alarmController))
);

router.get('/isalarm', awaitHandlerFactory(alarmController.get_isAlarm.bind(alarmController)));

router.get('/', awaitHandlerFactory(alarmController.get_last.bind(alarmController)));
router.get('/:id', awaitHandlerFactory(alarmController.get_id.bind(alarmController)));

export = router;
