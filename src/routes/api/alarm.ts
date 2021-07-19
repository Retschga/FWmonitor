'use strict';

import express from 'express';
import apicache from 'apicache';

import alarmController from '../../controllers/alarm';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import * as ValidatorAlarm from '../../middleware/alarmValidator';
import { auth_api, UserRights } from '../../middleware/auth';

const router = express.Router();
const cache = apicache.middleware;

// Alarmliste
router.get(
    '/list',
    //    auth_api(UserRights.admin, UserRights.car),
    ValidatorAlarm.getList,
    awaitHandlerFactory(alarmController.get_list.bind(alarmController))
);

// Sende Alarm Einstellungen
router.get(
    '/alarmsettings',
    auth_api(UserRights.admin),
    awaitHandlerFactory(alarmController.get_alarmsettings.bind(alarmController))
);
router.post(
    '/alarmsettings/telegram',
    auth_api(UserRights.admin),
    ValidatorAlarm.updateAlarmTelegram,
    awaitHandlerFactory(alarmController.update_alarmsettings_telegram.bind(alarmController))
);
router.post(
    '/alarmsettings/app',
    ValidatorAlarm.updateAlarmApp,
    auth_api(UserRights.admin),
    awaitHandlerFactory(alarmController.update_alarmsettings_app.bind(alarmController))
);

// Alarm Rückmeldung
router.post(
    '/userstatus/:id',
    ValidatorAlarm.updateUserstatus,
    awaitHandlerFactory(alarmController.update_userstatus.bind(alarmController))
);

// Ist ein Alarm anstehend
router.get('/isalarm', awaitHandlerFactory(alarmController.get_isAlarm.bind(alarmController)));

// Strassencache für Karte
router.get(
    '/streetcache/:id',
    cache('60 minutes'),
    awaitHandlerFactory(alarmController.get_streetCache.bind(alarmController))
);

// Routencache für Karte
router.get(
    '/route/:id',
    cache('60 minutes'),
    awaitHandlerFactory(alarmController.get_route.bind(alarmController))
);

// Alarm Details
router.get('/last', awaitHandlerFactory(alarmController.get_last.bind(alarmController)));
router.get('/', awaitHandlerFactory(alarmController.get_last.bind(alarmController)));
router.get('/:id', awaitHandlerFactory(alarmController.get_id.bind(alarmController)));

export = router;
