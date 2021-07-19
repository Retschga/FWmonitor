'use strict';

import { Request, Response } from 'express';
import { UserStatus } from '../models/user';
import { checkValidation } from './controller';
import UserService from '../services/user';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import logging from '../utils/logging';

const NAMESPACE = 'User_Controller';

class UserController {
    /**
     * Findet einen Benutzer anhand der ID
     */
    public async get_user_id(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_user_id');
        checkValidation(req);

        const list = await UserService.find_by_userid(Number(req.params.id), false);
        if (!list || list.length < 1) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'User not found');
        }

        // Passtwort Hash aus der Antwort entfernen
        for (let i = 0; i < list.length; i++) {
            list[i].appPasswort = '****';
        }

        res.send(list);
    }

    /**
     * Liste aller Benutzer (approved und not approved)
     */
    public async get_user_all(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_user_all');

        const list1 = await UserService.find_all_approved();
        const list2 = await UserService.find_all_notApproved();

        // Passwort Hash aus der Antwort entfernen
        for (let i = 0; i < list1.length; i++) {
            list1[i].appPasswort = '****';
        }
        for (let i = 0; i < list2.length; i++) {
            list2[i].appPasswort = '****';
        }

        res.send({ approved: list1, blocked: list2 });
    }

    /**
     * Update eines Benutzers
     */
    public async update_user_id(req: Request, res: Response) {
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
            await UserService.update_roles_praes(
                Number(req.params.id),
                Number(req.body.praes) == 1
            );
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }

        res.send('OK');
    }

    /**
     * Liste aller Kalendergruppen eines Benutzers
     */
    public async get_user_calendargroups_id(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_user_calendargroups_id');

        const calendargroups = await UserService.get_group_calendar(Number(req.params.id));
        if (!calendargroups) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'User not found');
        }

        res.send(calendargroups);
    }

    /**
     * Berechtigungen des angemeldeten Benutzers
     */
    public async get_user_rights(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_user_rights');

        res.send({
            userid: req.session.userid,
            telegramid: req.session.telegramid,
            admin: req.session.admin,
            calendar_min: req.session.calendar_min,
            calendar_full: req.session.calendar_full,
            telefone: req.session.telefone,
            praes: req.session.praesentation,
            name: req.session.name
        });
    }

    /**
     * Berechtigungen aller Benutzer
     */
    public async get_user_roles_all(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_user_roles_all');

        const users = await UserService.get_roles_all();
        if (!users) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No users found');
        }

        res.send(users);
    }

    /**
     * Status eines Benutzers
     */
    public async get_user_status_id(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_user_status_id');
        checkValidation(req);

        const status = await UserService.get_status(Number(req.params.id));
        if (!status) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'User not found');
        }

        res.send(status);
    }

    /**
     * Statusliste aller Benutzer
     */
    public async get_user_status_all(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'get_user_status_all');
        const statusList = await UserService.get_status_allUsers();
        if (statusList.length < 1) {
            throw new HttpException(HttpStatusCodes.NOT_FOUND, 'No users found');
        }

        res.send(statusList);
    }

    /**
     * Update Benutzerstatus
     */
    public async update_user_status_id(req: Request, res: Response) {
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

    /**
     * Update Statusplan
     */
    public async update_user_statusPlans_id(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'update_user_statusPlans_id');
        checkValidation(req);

        try {
            await UserService.update_status_plan(Number(req.params.id), String(req.body.value));
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }

        res.send('OK');
    }

    /**
     * Update Status verborgen
     */
    public async update_user_statusHidden_id(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'update_user_statusHidden_id');
        checkValidation(req);

        try {
            await UserService.update_status_hidden(Number(req.params.id), Boolean(req.body.value));
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }

        res.send('OK');
    }

    /**
     * Benutzer löschen
     */
    public async delete_id(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'delete');
        checkValidation(req);

        try {
            await UserService.delete(Number(req.params.id));
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }

        res.send('OK');
    }

    /**
     * Benutzer freigeben
     */
    public async approve_id(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'approve');
        checkValidation(req);

        try {
            await UserService.set_approved(Number(req.params.id));
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }

        res.send('OK');
    }

    /**
     * Update Kalenderbenachrichtigungen
     */
    public async update_user_notifications_calendar_id(req: Request, res: Response) {
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

    /**
     * Update App Benachrichtigungen
     */
    public async update_user_notifications_app_id(req: Request, res: Response) {
        logging.debug(NAMESPACE, 'update_user_appNotifications_id');
        checkValidation(req);

        try {
            await UserService.update_notifications_app(
                Number(req.params.id),
                Number(req.body.value),
                String(req.body.subscription)
            );
        } catch (error) {
            throw new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'No rows changed');
        }
        res.send('OK');
    }
}

export default new UserController();
