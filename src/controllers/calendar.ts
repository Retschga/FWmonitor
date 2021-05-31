'use strict';

import { Request, Response, NextFunction } from 'express';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import { calendarService } from '../services/calendar';
import logging from '../utils/logging';
import { checkValidation } from './controller';

const NAMESPACE = 'CalerndarController';

class CalendarController {
    public async get_id(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_next');

        let list = await calendarService.find_id(Number(req.params.id));
        if (!list) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Entry found');
        }
        res.send(list[0]);
    }

    public async get_next(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_next');

        let list = await calendarService.find_all_upcoming();
        if (!list) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Entry found');
        }
        res.send(list[0]);
    }

    public async get_list_upcoming(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_list_upcoming');

        let list = await calendarService.find_all_upcoming();
        if (!list) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Entry found');
        }
        res.send(list);
    }

    public async get_list_all(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_list_all');

        let list = await calendarService.find_all();
        if (!list) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Entry found');
        }
        res.send(list);
    }

    public async update_id(req: Request, res: Response, next: NextFunction) {
        checkValidation(req);

        try {
            await calendarService.update(
                Number(req.params.id),
                String(req.body.summary),
                new Date(String(req.body.start)),
                new Date(String(req.body.remind)),
                String(req.body.group)
            );
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }
        res.send('OK');
    }

    public async create(req: Request, res: Response, next: NextFunction) {
        checkValidation(req);

        try {
            let now = new Date();
            now.setTime(now.getTime() + 60 * 60 * 1000);
            await calendarService.create('Neuer Termin', now, now, '');
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }
        res.send('OK');
    }

    public async delete(req: Request, res: Response, next: NextFunction) {
        checkValidation(req);

        try {
            await calendarService.delete(Number(req.params.id));
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }
        res.send('OK');
    }
}

export default new CalendarController();
