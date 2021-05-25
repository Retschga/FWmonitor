'use strict';

import { Request, Response, NextFunction } from 'express';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import UserService from '../services/user';
import logging from '../utils/logging';
import { checkValidation } from './controller';
import { UserStatus } from '../models/user';

const NAMESPACE = 'User_Controller';

class UserController {
    // User

    public async get_user_id(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_user_id');
        checkValidation(req);

        let list = await UserService.find_by_userid(Number(req.params.id));
        if (!list || list.length < 1) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'User not found');
        }

        for (let i = 0; i < list.length; i++) {
            list[i].appPasswort = '****';
        }

        res.send(list);
    }

    public async get_user_all(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_user_all');

        let list1 = await UserService.find_all_approved();
        let list2 = await UserService.find_all_notApproved();
        for (let i = 0; i < list1.length; i++) {
            list1[i].appPasswort = '****';
        }
        for (let i = 0; i < list2.length; i++) {
            list2[i].appPasswort = '****';
        }
        res.send({ approved: list1, blocked: list2 });
    }

    public async update_user_id(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_user_status_id');
        checkValidation(req);

        try {
            await UserService.update_group(Number(req.params.id), Number(req.body.group));
            await UserService.update_roles_admin(
                Number(req.params.id),
                Number(req.body.admin) == 1
            );
            await UserService.update_roles_kalender(
                Number(req.params.id),
                Number(req.body.kalender)
            );
            await UserService.update_roles_telefonliste(
                Number(req.params.id),
                Number(req.body.telefonliste) == 1
            );
            await UserService.update_roles_drucker(
                Number(req.params.id),
                Number(req.body.drucker) == 1
            );
            await UserService.update_roles_softwareInfo(
                Number(req.params.id),
                Number(req.body.softwareInfo) == 1
            );
            await UserService.update_group_calendar(
                Number(req.params.id),
                String(req.body.kalenderGroups)
            );
            await UserService.update_status_hidden(
                Number(req.params.id),
                Number(req.body.statusHidden) == 1
            );
            await UserService.update_roles_stAGT(
                Number(req.params.id),
                Number(req.body.stAGT) == 1
            );
            await UserService.update_roles_stMA(Number(req.params.id), Number(req.body.stMA) == 1);
            await UserService.update_roles_stGRF(
                Number(req.params.id),
                Number(req.body.stGRF) == 1
            );
            await UserService.update_roles_stZUGF(
                Number(req.params.id),
                Number(req.body.stZUGF) == 1
            );
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }
        res.send('OK');
    }

    // Status

    public async get_user_status_id(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_user_status_id');
        checkValidation(req);

        let status = await UserService.get_status(Number(req.params.id));
        if (!status) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'User not found');
        }

        res.send(status);
    }

    public async get_user_status_all(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'get_user_status_all');
        let statusList = await UserService.get_status_allUsers();
        if (statusList.length < 1) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'User not found');
        }

        res.send(statusList);
    }

    public async update_user_status_id(req: Request, res: Response, next: NextFunction) {
        checkValidation(req);

        let status: UserStatus;
        switch (req.body.value) {
            case 1:
                status = UserStatus.VERFUEGBAR;
                break;
            case 2:
                status = UserStatus.NICHT_VERFUEGBAR;
                break;
            default:
                throw new HttpException(
                    HttpStatusCodes.INTERNAL_SERVER_ERROR,
                    'Wrong value for value parameter'
                );
                break;
        }

        try {
            await UserService.update_status(
                Number(req.params.id),
                status,
                req.body.until ? new Date(String(req.body.until)) : undefined
            );
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }
        res.send('OK');
    }

    public async update_user_statusPlans_id(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'update_user_statusPlans_id');
        checkValidation(req);

        try {
            await UserService.update_status_plan(Number(req.params.id), String(req.body.value));
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }
        res.send('OK');
    }

    public async update_user_statusHidden_id(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'update_user_statusHidden_id');
        checkValidation(req);

        try {
            await UserService.update_status_hidden(Number(req.params.id), Boolean(req.body.value));
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }
        res.send('OK');
    }

    public async delete(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'delete');
        checkValidation(req);

        try {
            await UserService.delete(Number(req.params.id));
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }
        res.send('OK');
    }

    public async approve(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'approve');
        checkValidation(req);

        try {
            await UserService.set_approved(Number(req.params.id));
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }
        res.send('OK');
    }

    // Notifications
    public async update_user_notifications_calendar(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        checkValidation(req);

        try {
            await UserService.update_notifications_calendar(
                Number(req.params.id),
                Boolean(req.body.until)
            );
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }
        res.send('OK');
    }

    public async update_user_notifications_app_id(req: Request, res: Response, next: NextFunction) {
        logging.debug(NAMESPACE, 'update_user_appNotifications_id');
        checkValidation(req);

        try {
            await UserService.update_notifications_app(
                Number(req.params.id),
                Number(req.body.value),
                'dsfsdfsdfsdfsf'
            );
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }
        res.send('OK');
    }
}

export default new UserController();
