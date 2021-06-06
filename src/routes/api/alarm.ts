'use strict';

import express from 'express';
import alarmController from '../../controllers/alarm';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import * as ValidatorAlarm from '../../middleware/alarmValidator';
import apicache from 'apicache';

const router = express.Router();
let cache = apicache.middleware;

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

router.get(
    '/streetcache/:id',
    cache('60 minutes'),
    awaitHandlerFactory(alarmController.get_streetCache.bind(alarmController))
);

router.get(
    '/route/:id',
    cache('60 minutes'),
    awaitHandlerFactory(alarmController.get_route.bind(alarmController))
);

router.get('/last', awaitHandlerFactory(alarmController.get_last.bind(alarmController)));
router.get('/', awaitHandlerFactory(alarmController.get_last.bind(alarmController)));
router.get(
    '/:id',
    cache('60 minutes'),
    awaitHandlerFactory(alarmController.get_id.bind(alarmController))
);

export = router;
