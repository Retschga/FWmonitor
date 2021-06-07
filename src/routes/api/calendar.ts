'use strict';

import express from 'express';
import CalendarController from '../../controllers/calendar';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import * as ValidatorCalendar from '../../middleware/calendarValidator';
import { auth_api, UserRights } from '../../middleware/auth';

const router = express.Router();

// Nächster Termin für Benutzer
router.get('/next/:id', awaitHandlerFactory(CalendarController.get_next.bind(CalendarController)));

// Alle zukünftigen Termine
router.get(
    '/upcoming',
    awaitHandlerFactory(CalendarController.get_list_upcoming.bind(CalendarController))
);

// All Termine (auch vergangen)
router.get('/all', awaitHandlerFactory(CalendarController.get_list_all.bind(CalendarController)));

// Neuer Termin
router.get(
    '/new',
    auth_api(UserRights.admin, UserRights.calendar_min, UserRights.calendar_full),
    awaitHandlerFactory(CalendarController.create.bind(CalendarController))
);

// Termin löschen
router.get(
    '/delete/:id',
    auth_api(UserRights.admin, UserRights.calendar_min, UserRights.calendar_full),
    awaitHandlerFactory(CalendarController.delete.bind(CalendarController))
);

// Einzelner Termin
router.get('/:id', awaitHandlerFactory(CalendarController.get_id.bind(CalendarController)));

// Termin bearbeiten
router.post(
    '/:id',
    auth_api(UserRights.admin, UserRights.calendar_min, UserRights.calendar_full),
    ValidatorCalendar.update,
    awaitHandlerFactory(CalendarController.update_id.bind(CalendarController))
);

export = router;
