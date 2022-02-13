'use strict';

import { Request, Response } from 'express';

import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import { calendarService } from '../services/calendar';
import { checkValidation } from './controller';
import logging from '../utils/logging';
import userService from '../services/user';

const NAMESPACE = 'Calerndar_Controller';

class CalendarController {
    /**
     * Findet einen Kalendereintrag anhand der ID
     */
    public async get_id(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_next');

        const list = await calendarService.find_id(Number(req.params.id));
        if (!list) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Entry found');
        }

        res.send(list[0]);
    }

    /**
     * Findet den nächsten anstehenden Termin des Users
     */
    public async get_next(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_next');

        const list = await calendarService.find_all_upcoming();
        if (!list || list.length < 1) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Entry found');
        }

        const user = await userService.find_by_userid(Number(req.params.id));
        if (!user || user.length < 1) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'User not found');
        }

        const usergroups = user[0].kalenderGroups.split('|');

        for (let i = 0; i < list.length; i++) {
            for (let j = 0; j < list[i].group.length; j++) {
                if (usergroups.indexOf(String(list[i].group[j].id)) != -1) {
                    res.send(list[i]);
                    return;
                }
            }
        }

        throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Entry found');
    }

    /**
     * Findet alle kommenden Termine
     */
    public async get_list_upcoming(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_list_upcoming');

        const list = await calendarService.find_all_upcoming();
        if (!list) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Entry found');
        }
        res.send(list);
    }

    /**
     * Findet alle vorhandenen Kalendereinträge
     */
    public async get_list_all(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_list_all');

        const list = await calendarService.find_all();
        if (!list) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Entry found');
        }
        res.send(list);
    }

    /**
     * Update eines bestimmten Kalendereintrags
     */
    public async update_id(req: Request, res: Response) {
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
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Entry update error');
        }

        res.send('OK');
    }

    /**
     * Erstellt einen neuen Kalendereintrag
     */
    public async create(req: Request, res: Response) {
        checkValidation(req);

        try {
            let eventDate = new Date();
            eventDate.setTime(eventDate.getTime() + 60 * 60 * 1000);

            if (req.body.year && req.body.month && req.body.day) {
                eventDate = new Date(req.body.year, req.body.month, req.body.day);
            }

            await calendarService.create('Neuer Termin', eventDate, eventDate, '');
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Entry creation error');
        }

        res.send('OK');
    }

    /**
     * Löscht einen Kalendereintrag
     */
    public async delete(req: Request, res: Response) {
        checkValidation(req);

        try {
            await calendarService.delete(Number(req.params.id));
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Entry deletion error');
        }

        res.send('OK');
    }
}

export default new CalendarController();
