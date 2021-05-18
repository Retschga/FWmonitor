'use strict';

import { Request, Response, NextFunction } from 'express';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import CalendarGroupService from '../services/calendarGroup';
import logging from '../utils/logging';
import { checkValidation } from './controller';

const NAMESPACE = 'CalendarGroupController';

class CalendarGroupController {
    public async get_list_all(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_list_all');

        let alarmlist = await CalendarGroupService.find_all();
        if (!alarmlist) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No calendarGroup found');
        }
        res.send(alarmlist);
    }

    public async update_id(req: Request, res: Response, next: NextFunction) {
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
