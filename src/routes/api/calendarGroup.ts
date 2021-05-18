'use strict';

import express from 'express';
import CalendarGroupController from '../../controllers/calendarGroup';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import * as ValidatorCalendarGroup from '../../middleware/calendarGroupValidator';

const router = express.Router();

router.get(
    '/',
    awaitHandlerFactory(CalendarGroupController.get_list_all.bind(CalendarGroupController))
);

router.post(
    '/:id',
    ValidatorCalendarGroup.update,
    awaitHandlerFactory(CalendarGroupController.update_id.bind(CalendarGroupController))
);

export = router;
