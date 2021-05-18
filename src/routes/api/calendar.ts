'use strict';

import express from 'express';
import CalendarController from '../../controllers/calendar';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import * as ValidatorCalendar from '../../middleware/calendarValidator';

const router = express.Router();

router.get('/next', awaitHandlerFactory(CalendarController.get_next.bind(CalendarController)));

router.get(
    '/upcoming',
    awaitHandlerFactory(CalendarController.get_list_upcoming.bind(CalendarController))
);

router.get('/all', awaitHandlerFactory(CalendarController.get_list_all.bind(CalendarController)));

router.post(
    '/update/:id',
    ValidatorCalendar.update,
    awaitHandlerFactory(CalendarController.update_id.bind(CalendarController))
);

router.get('/new', awaitHandlerFactory(CalendarController.create.bind(CalendarController)));

router.get('/delete/:id', awaitHandlerFactory(CalendarController.delete.bind(CalendarController)));

export = router;
