'use strict';

import * as deviceValidator from '../../middleware/deviceValidator';

import { UserRights, auth_api } from '../../middleware/auth';

import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import deviceController from '../../controllers/device';
import express from 'express';

const router = express.Router();

router.get(
    '/all',
    auth_api(UserRights.admin),
    awaitHandlerFactory(deviceController.get_all.bind(deviceController))
);
router.get(
    '/list/praesentation',
    auth_api(UserRights.admin, UserRights.praesentation),
    awaitHandlerFactory(deviceController.get_praesentation.bind(deviceController))
);
router.post(
    '/:id/action',
    auth_api(UserRights.admin),
    deviceValidator.send_action,
    awaitHandlerFactory(deviceController.send_action.bind(deviceController))
);

router.post(
    '/:id/praesentation/start',
    auth_api(UserRights.admin, UserRights.praesentation),
    awaitHandlerFactory(deviceController.start_praesentation.bind(deviceController))
);

router.post(
    '/:id/praesentation/action',
    auth_api(UserRights.admin, UserRights.praesentation),
    deviceValidator.send_action_praesentation,
    awaitHandlerFactory(deviceController.send_action_praesentation.bind(deviceController))
);

router.post(
    '/:id/praesentation/webrtc',
    auth_api(UserRights.admin, UserRights.praesentation),
    deviceValidator.send_action_webrtc,
    awaitHandlerFactory(deviceController.send_action_webrtc.bind(deviceController))
);

export = router;
