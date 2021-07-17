'use strict';

import { Request, Response, NextFunction } from 'express';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import { checkValidation } from './controller';
import GroupService from '../services/group';
import logging from '../utils/logging';

const NAMESPACE = 'GroupController';

class GroupController {
    /**
     * Findet eine Gruppe anhand der ID
     */
    public async get_id(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_id');
        checkValidation(req);

        let list = await GroupService.find_by_id(Number(req.params.id));
        if (!list || list.length < 1) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'Group not found');
        }

        res.send(list);
    }

    /**
     * Liste aller Gruppen
     */
    public async get_list_all(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_list_all');

        let alarmlist = await GroupService.find_all();
        if (!alarmlist) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No Group found');
        }

        res.send(alarmlist);
    }

    /**
     * Update einer Gruppe
     */
    public async update_id(req: Request, res: Response, next: NextFunction) {
        checkValidation(req);

        try {
            await GroupService.update(
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

export default new GroupController();
