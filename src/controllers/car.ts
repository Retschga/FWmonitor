'use strict';

import { Request, Response } from 'express';
import { createNewPassword, hashPassword } from '../utils/security';

import CarService from '../services/car';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import { checkValidation } from './controller';
import logging from '../utils/logging';

const NAMESPACE = 'Car_Controller';

class CalendarController {
    /**
     * Findet ein Auto anhand der ID
     */
    public async get_id(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_id');
        checkValidation(req);

        const list = await CarService.find_by_id(Number(req.params.id));
        if (!list || list.length < 1) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'Car not found');
        }

        // Passwort Hash aus Antwort entfernen
        for (let i = 0; i < list.length; i++) {
            list[i].appPasswort = '****';
        }

        res.send(list[0]);
    }

    /**
     * Findet alle Autos
     */
    public async get_list_all(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_list_all');

        const list = await CarService.find();
        if (!list) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Car found');
        }

        // Passwort Hash aus Antwort entferenen
        for (let i = 0; i < list.length; i++) {
            list[i].appPasswort = '****';
        }

        res.send(list);
    }

    /**
     * Findet alle Funkstati
     */
    public async get_funkstatus_list_all(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_funkstatus_list_all', {
            limit: req.query.limit,
            offset: req.query.offset
        });
        checkValidation(req);

        const list = await CarService.find_FunkStatus(
            {},
            Number(req.query.limit),
            Number(req.query.offset),
            'ORDER BY id DESC'
        );
        if (!list) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Status found');
        }

        res.send(list);
    }

    /**
     * Update eines Autos
     */
    public async update_id(req: Request, res: Response) {
        checkValidation(req);

        const password = req.body.appPassword
            ? hashPassword(String(req.body.appPassword))
            : undefined;

        try {
            await CarService.update(
                Number(req.params.id),
                String(req.body.name),
                String(req.body.appBenutzer),
                String(req.body.funk_name),
                password
            );
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }

        res.send('OK');
    }

    /**
     * Erstellt ein neues Auto
     */
    public async create(req: Request, res: Response) {
        checkValidation(req);

        try {
            await CarService.create('Neues Auto', '', '');
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }

        res.send('OK');
    }

    /**
     * Löscht ein Auto
     */
    public async delete(req: Request, res: Response) {
        checkValidation(req);

        try {
            await CarService.delete(Number(req.params.id));
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }

        res.send('OK');
    }

    /**
     * Generiert ein neues Passwort
     */
    public async password(req: Request, res: Response) {
        const password = createNewPassword();
        res.send({ password: password.password });
    }
}

export default new CalendarController();
