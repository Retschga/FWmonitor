'use strict';

import { Request, Response, NextFunction } from 'express';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import { calendarService } from '../services/calendar';
import logging from '../utils/logging';
import { checkValidation } from './controller';
import userService from '../services/user';

const NAMESPACE = 'CalerndarController';

class CalendarController {
    public async get_id(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_next');

        const list = await calendarService.find_id(Number(req.params.id));
        if (!list) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Entry found');
        }
        res.send(list[0]);
    }

    public async get_next(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_next');

        const list = await calendarService.find_all_upcoming();
        if (!list || list.length < 1) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Entry found1');
        }

        const user = await userService.find_by_userid(Number(req.params.id));
        if (!user || user.length < 1) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Entry found2');
        }

        let usergroups = user[0].kalenderGroups == '' ? ['1'] : user[0].kalenderGroups.split('|');
        console.log('usergroups: ', usergroups);

        for (let i = 0; i < list.length; i++) {
            for (let j = 0; j < list[i].group.length; j++) {
                if (usergroups.indexOf(String(list[i].group[j].id)) != -1) {
                    res.send(list[i]);
                    return;
                }
            }
        }

        throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Entry found6');
    }

    public async get_list_upcoming(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_list_upcoming');

        const list = await calendarService.find_all_upcoming();
        if (!list) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Entry found');
        }
        res.send(list);
    }

    public async get_list_all(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_list_all');

        const list = await calendarService.find_all();
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
