'use strict';

import express from 'express';
import CalendarGroupController from '../../controllers/calendarGroup';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import * as ValidatorCalendarGroup from '../../middleware/calendarGroupValidator';
import { auth_api, UserRights } from '../../middleware/auth';

const router = express.Router();

router.get(
    '/',
    awaitHandlerFactory(CalendarGroupController.get_list_all.bind(CalendarGroupController))
);

router.post(
    '/:id',
    auth_api(UserRights.admin),
    ValidatorCalendarGroup.update,
    awaitHandlerFactory(CalendarGroupController.update_id.bind(CalendarGroupController))
);

export = router;
