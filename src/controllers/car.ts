'use strict';

import { Request, Response, NextFunction } from 'express';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import CarService from '../services/car';
import logging from '../utils/logging';
import { checkValidation } from './controller';
import { createNewPassword, hashPassword } from '../utils/security';

const NAMESPACE = 'CarController';

class CalendarController {
    public async get_id(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_id');
        checkValidation(req);

        let list = await CarService.find_by_id(Number(req.params.id));
        if (!list || list.length < 1) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'Car not found');
        }

        for (let i = 0; i < list.length; i++) {
            list[i].appPasswort = '****';
        }

        res.send(list);
    }

    public async get_list_all(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_list_all');

        let list = await CarService.find();
        if (!list) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Car found');
        }

        for (let i = 0; i < list.length; i++) {
            list[i].appPasswort = '****';
        }

        res.send(list);
    }

    public async update_id(req: Request, res: Response, next: NextFunction) {
        checkValidation(req);

        const password = req.body.appPassword
            ? hashPassword(String(req.body.appPassword))
            : undefined;

        try {
            await CarService.update(
                Number(req.params.id),
                String(req.body.name),
                String(req.body.appBenutzer),
                password
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
            await CarService.create('Neues Auto', '', '');
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }
        res.send('OK');
    }

    public async delete(req: Request, res: Response, next: NextFunction) {
        checkValidation(req);

        try {
            await CarService.delete(Number(req.params.id));
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }
        res.send('OK');
    }

    public async password(req: Request, res: Response, next: NextFunction) {
        const password = createNewPassword();
        res.send({ password: password.password });
    }
}

export default new CalendarController();
