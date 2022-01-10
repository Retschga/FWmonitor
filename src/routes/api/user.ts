'use strict';

import express from 'express';
import userController from '../../controllers/user';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import * as ValidatorsUser from '../../middleware/userValidator';
import { auth_api, UserRights } from '../../middleware/auth';

const router = express.Router();

// Kalendergruppen des Benutzers
router.get(
    '/calendargroups/:id',
    auth_api(UserRights.admin, UserRights.ownid),
    awaitHandlerFactory(userController.get_user_calendargroups_id.bind(userController))
);

// Benutzer Rechte
router.get('/rights', awaitHandlerFactory(userController.get_user_rights.bind(userController)));

// Benutzer Rollen
router.get(
    '/roles/all',
    auth_api(UserRights.admin, UserRights.http),
    awaitHandlerFactory(userController.get_user_roles_all.bind(userController))
);

// Benutzer Status alle (nicht ausgeblendete)
router.get(
    '/status/all',
    awaitHandlerFactory(userController.get_user_status_all.bind(userController))
);

// Benutzer Status
router.get(
    '/status/:id',
    auth_api(UserRights.admin, UserRights.ownid),
    awaitHandlerFactory(userController.get_user_status_id.bind(userController))
);

// Benutzer Status Update
router.post(
    '/status/update/:id',
    auth_api(UserRights.ownid),
    ValidatorsUser.updateUserStatus,
    awaitHandlerFactory(userController.update_user_status_id.bind(userController))
);
// Statusplan Update
router.post(
    '/status/plans/update/:id',
    auth_api(UserRights.ownid),
    ValidatorsUser.updateUserStatusPlans,
    awaitHandlerFactory(userController.update_user_statusPlans_id.bind(userController))
);
// Status Versteckt Update
router.post(
    '/status/hidden/update/:id',
    auth_api(UserRights.ownid),
    ValidatorsUser.updateUserStatusHidden,
    awaitHandlerFactory(userController.update_user_statusHidden_id.bind(userController))
);
// App Benachrichtigungen Update
router.post(
    '/notifications/app/:id',
    auth_api(UserRights.ownid),
    ValidatorsUser.updateNotificationsApp,
    awaitHandlerFactory(userController.update_user_notifications_app_id.bind(userController))
);
// Kalender Benachrichtigungen Update
router.post(
    '/notifications/calendar/:id',
    auth_api(UserRights.ownid),
    ValidatorsUser.updateNotificationsCalendar,
    awaitHandlerFactory(userController.update_user_notifications_calendar_id.bind(userController))
);

// Benutzerliste
router.get(
    '/',
    auth_api(UserRights.admin),
    awaitHandlerFactory(userController.get_user_all.bind(userController))
);

// Benutzer
router.get(
    '/:id',
    auth_api(UserRights.admin, UserRights.ownid),
    awaitHandlerFactory(userController.get_user_id.bind(userController))
);

// Benutzer Update
router.post(
    '/:id',
    auth_api(UserRights.admin),
    ValidatorsUser.updateUser,
    awaitHandlerFactory(userController.update_user_id.bind(userController))
);
router.post(
    '/approve/:id',
    auth_api(UserRights.admin),
    awaitHandlerFactory(userController.approve_id.bind(userController))
);
router.post(
    '/delete/:id',
    auth_api(UserRights.admin),
    awaitHandlerFactory(userController.delete_id.bind(userController))
);

export = router;
