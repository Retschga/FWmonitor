'use strict';

import { Request, Response, NextFunction } from 'express';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import AlarmService from '../services/alarm';
import logging from '../utils/logging';
import { checkValidation } from './controller';

const NAMESPACE = 'Alarm_Controller';

class AlarmController {
    // Alarm

    public async get_id(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_alarm_id', { id: req.params.id });
        checkValidation(req);

        let list = await AlarmService.find_by_id(Number(req.params.id));
        if (!list) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'Alarm not found');
        }

        for (let i = 0; i < list.length; i++) {
            (list[i] as any)['color'] = AlarmService.getAlarmColor(list[i].einsatzstichwort);
        }

        res.send(list);
    }

    public async get_last(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_last');

        let list = await AlarmService.find({}, 1);
        if (!list) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Alarm found');
        }

        for (let i = 0; i < list.length; i++) {
            (list[i] as any)['color'] = AlarmService.getAlarmColor(list[i].einsatzstichwort);
        }

        res.send(list);
    }

    public async get_list(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_list', { limit: req.query.limit, offset: req.query.offset });
        checkValidation(req);

        let list = await AlarmService.find(
            {},
            Number(req.query.limit),
            Number(req.query.offset),
            'ORDER BY date DESC'
        );
        if (!list) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Alarm found');
        }

        for (let i = 0; i < list.length; i++) {
            (list[i] as any)['color'] = AlarmService.getAlarmColor(list[i].einsatzstichwort);
        }

        res.send(list);
    }

    public async update_alarmsettings_telegram(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'update_alarm_telegram', {
            value: req.body.value
        });
        checkValidation(req);

        AlarmService.set_alarmsettings_telegram(Boolean(req.query.value));

        res.send('OK');
    }

    public async update_alarmsettings_app(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'update_alarm_app', {
            value: req.body.value
        });
        checkValidation(req);

        AlarmService.set_alarmsettings_app(Boolean(req.query.value));

        res.send('OK');
    }

    public async get_alarmsettings(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_alarmsettings');

        const response = AlarmService.get_alarmsettings();

        res.send(response);
    }
}

export default new AlarmController();
