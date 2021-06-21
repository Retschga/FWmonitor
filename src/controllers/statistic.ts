'use strict';

import { Request, Response, NextFunction } from 'express';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import StatisticServise from '../services/statistic';
import logging from '../utils/logging';

const NAMESPACE = 'Statistic_Controller';

class StatisticController {
    // Alarm

    public async get_year(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_year');

        let list = await StatisticServise.get(Number(req.params.year));
        if (!list) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No entrys not found');
        }
        res.send(list);
    }

    public async get_einsatzzeit(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_einsatzzeit');

        let response;
        response = await StatisticServise.einsatzzeit(
            Number(req.params.id),
            Number(req.params.year)
        );
        if (!response) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No time not found');
        }
        res.send(response);
    }

    public async get_einsatzzeit_all(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_einsatzzeit_all');

        let response;
        response = await StatisticServise.einsatzzeit_all(Number(req.params.year));
        if (!response) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No time not found');
        }
        res.send(response);
    }
}

export default new StatisticController();
