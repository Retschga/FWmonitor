'use strict';

import express from 'express';
import userController from '../../controllers/user';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import * as ValidatorsUser from '../../middleware/userValidator';

const router = express.Router();

router.get(
    '/calendargroups/:id',
    awaitHandlerFactory(userController.get_user_calendargroups_id.bind(userController))
);

router.get('/rights', awaitHandlerFactory(userController.get_user_rights.bind(userController)));

router.get(
    '/roles/all',
    awaitHandlerFactory(userController.get_user_roles_all.bind(userController))
);

router.get(
    '/status/all',
    awaitHandlerFactory(userController.get_user_status_all.bind(userController))
);
router.get(
    '/status/:id',
    awaitHandlerFactory(userController.get_user_status_id.bind(userController))
);

router.post(
    '/status/update/:id',
    ValidatorsUser.updateUserStatus,
    awaitHandlerFactory(userController.update_user_status_id.bind(userController))
);
router.post(
    '/status/plans/update/:id',
    ValidatorsUser.updateUserStatusPlans,
    awaitHandlerFactory(userController.update_user_statusPlans_id.bind(userController))
);
router.post(
    '/status/hidden/update/:id',
    ValidatorsUser.updateUserStatusHidden,
    awaitHandlerFactory(userController.update_user_statusHidden_id.bind(userController))
);
router.post(
    '/notifications/app',
    ValidatorsUser.updateNotificationsApp,
    awaitHandlerFactory(userController.update_user_notifications_app_id.bind(userController))
);
router.post(
    '/notifications/calendar',
    ValidatorsUser.updateNotificationsCalendar,
    awaitHandlerFactory(userController.update_user_notifications_calendar.bind(userController))
);

router.get('/', awaitHandlerFactory(userController.get_user_all.bind(userController)));

router.get('/:id', awaitHandlerFactory(userController.get_user_id.bind(userController)));

router.post(
    '/:id',
    ValidatorsUser.updateUser,
    awaitHandlerFactory(userController.update_user_id.bind(userController))
);
router.get('/approve/:id', awaitHandlerFactory(userController.approve.bind(userController)));
router.get('/delete/:id', awaitHandlerFactory(userController.delete.bind(userController)));

export = router;
