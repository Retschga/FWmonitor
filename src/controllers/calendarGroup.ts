'use strict';

import { Request, Response } from 'express';
import { checkValidation } from './controller';
import CalendarGroupService from '../services/calendarGroup';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import logging from '../utils/logging';

const NAMESPACE = 'CalendarGroup_Controller';

class CalendarGroupController {
    /**
     * Liest alle Kalendergruppen aus
     */
    public async get_list_all(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_list_all');

        const alarmlist = await CalendarGroupService.find_all();
        if (!alarmlist) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No calendarGroup found');
        }

        res.send(alarmlist);
    }

    /**
     * Update einer Kalendergruppe
     */
    public async update_id(req: Request, res: Response) {
        checkValidation(req);

        try {
            await CalendarGroupService.update(
                Number(req.params.id),
                String(req.body.name),
                String(req.body.pattern)
            );
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }

        res.send('OK');
    }
}

export default new CalendarGroupController();
