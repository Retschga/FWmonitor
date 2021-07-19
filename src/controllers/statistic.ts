'use strict';

import { Request, Response } from 'express';
import StatisticServise from '../services/statistic';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import logging from '../utils/logging';

const NAMESPACE = 'Statistic_Controller';

class StatisticController {
    /**
     * Einsatzstatistik für ein bestimmtes Jahr
     */
    public async get_year(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_year');

        const list = await StatisticServise.get(Number(req.params.year));
        if (!list) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No entrys not found');
        }

        res.send(list);
    }

    /**
     * Einsatzzeit eines Benutzers für ein bestimmtes Jahr
     */
    public async get_einsatzzeit(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_einsatzzeit');

        const response = await StatisticServise.einsatzzeit(
            Number(req.params.id),
            Number(req.params.year)
        );
        if (!response) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No time not found');
        }
        res.send(response);
    }

    /**
     * Einsatzzeit aller Benutzer für ein bestimmtes Jahr
     */
    public async get_einsatzzeit_all(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_einsatzzeit_all');

        const response = await StatisticServise.einsatzzeit_all(Number(req.params.year));
        if (!response) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No time not found');
        }

        res.send(response);
    }
}

export default new StatisticController();
