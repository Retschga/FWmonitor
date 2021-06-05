'use strict';

import logging from '../utils/logging';
import * as UserModel from '../models/user';
import { isJsonString } from '../utils/common';
import { UserStatus } from '../models/user';
import globalEvents from '../utils/globalEvents';

const NAMESPACE = 'User_Service';

class UserService {
    private statusToText(status: UserModel.UserStatus) {
        switch (status) {
            case UserModel.UserStatus.NICHT_VERFUEGBAR:
                return 'Nicht verfügbar';
            case UserModel.UserStatus.VERFUEGBAR:
                return 'Verfügbar';
            case UserModel.UserStatus.TELEGR_BOT_BLOCKED:
                return 'Err: Bot Telegram Bot blockiert';
            case UserModel.UserStatus.TELEGR_USER_DISABLED:
                return 'Err: Telegram Benutzer gelöscht';
            default:
                return 'Error';
        }
    }

    // USER
    public async find(params: object = {}, approved: boolean = true): Promise<UserModel.UserRow[]> {
        if (approved) {
            (params as any).approved = true;
        }
        const response = await UserModel.model.find(params);
        return response;
    }

    public async find_by_telegramid(telegramid: string): Promise<UserModel.UserRow[] | undefined> {
        const response = await UserModel.model.find({ telegramid: telegramid });
        if (response.length < 1) return;
        return response;
    }

    public async find_by_userid(id: Number): Promise<UserModel.UserRow[] | undefined> {
        const response = await UserModel.model.find({ id: id });
        if (response.length < 1) return;
        return response;
    }

    public async find_all_notApproved(): Promise<UserModel.UserRow[]> {
        return await this.find({ approved: 0 }, false);
    }

    public async find_all_approved() {
        return await this.find({ approved: 1 }, true);
    }

    public async create(telegramid: string, name: string, vorname: string) {
        logging.debug(NAMESPACE, 'create', { telegramid, name, vorname });
        let affectedRows = await UserModel.model.insert({
            telegramid: telegramid,
            name: name,
            vorname: vorname
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' create - No rows changed');
        }
    }

    public async delete(id: number) {
        logging.debug(NAMESPACE, 'delete', { id });
        let affectedRows = await UserModel.model.delete(id);

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' delete - No rows changed');
        }
    }

    public async set_approved(id: number) {
        let affectedRows = await UserModel.model.update(Number(id), {
            approved: true
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update_status_hidden - No rows changed');
        }
    }

    // STATUS
    public async get_status(id: number) {
        let result = await this.find({ id: id });
        if (result.length < 1) return;
        let user = result[0];
        return {
            id: user.id,
            status: user.status,
            until: user.statusUntil,
            hidden: user.statusHidden,
            plans: user.statusPlans,
            statustext: this.statusToText(user.status),
            name: user.name,
            vorname: user.vorname
        };
    }

    public async get_status_allUsers() {
        let response = await this.find_all_approved();
        response = response.filter(function (user) {
            return !user.statusHidden;
        });
        return response.map((user) => {
            return {
                id: user.id,
                status: user.status,
                until: user.statusUntil,
                hidden: user.statusHidden,
                statustext: this.statusToText(user.status),
                name: user.name,
                vorname: user.vorname
            };
        });
    }

    public async update_status(id: number, value: UserStatus, until?: Date | undefined) {
        let _untilstring = null;
        if (until) {
            _untilstring = until.toUTCString();
        }

        logging.debug(NAMESPACE, 'update_status', { id, value, until });
        let affectedRows = await UserModel.model.update(Number(id), {
            status: value,
            statusUntil: _untilstring
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update_status - No rows changed');
        }

        globalEvents.emit('userstatus-change');
    }

    public async update_status_plan(id: number, value: string) {
        logging.debug(NAMESPACE, 'update_status_plan', { id, value });
        if (!isJsonString(value)) {
            logging.debug(NAMESPACE, ' update_status_plan - value must be valid json');
            throw new Error(NAMESPACE + ' update_status_plan - value must be valid json');
        }

        let affectedRows = await UserModel.model.update(Number(id), {
            statusPlans: value
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update_status_plan - No rows changed');
        }
    }

    public async update_status_hidden(id: number, value: boolean) {
        let affectedRows = await UserModel.model.update(Number(id), {
            statusHidden: value
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update_status_hidden - No rows changed');
        }

        globalEvents.emit('userstatus-change');
    }

    public async update_notifications_calendar(id: number, value: boolean) {
        let affectedRows = await UserModel.model.update(Number(id), {
            sendRemembers: value
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update_calendarRemind - No rows changed');
        }
    }

    // App Settings
    public async get_login_id(id: number) {
        let result = await this.find({ id: id });
        if (result.length < 1) return;
        let user = result[0];
        return {
            id: user.id,
            username: user.telegramid,
            password: user.appPasswort
        };
    }

    public async get_login_telegramid(telegramid: string) {
        let result = await this.find({ telegramid: telegramid });
        if (result.length < 1) return;
        let user = result[0];
        return {
            id: user.id,
            username: user.telegramid,
            passwordHash: user.appPasswort
        };
    }

    public async update_login(id: number, password: string) {
        let affectedRows = await UserModel.model.update(Number(id), {
            appPasswort: password
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update_login - No rows changed');
        }
    }

    public async get_notifications_app(id: Number) {
        let result = await this.find({ id: id });
        if (result.length < 1) return;
        let user = result[0];
        return {
            id: user.id,
            appNotifications: user.appNotifications,
            appNotificationsSubscription: user.appNotificationsSubscription
        };
    }

    public async update_notifications_app(id: number, value: number, subscription: string) {
        let affectedRows = await UserModel.model.update(Number(id), {
            appNotifications: value,
            appNotificationsSubscription: subscription
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update_notifications_app - No rows changed');
        }
    }

    // Berechtigungen/Rollen
    public async get_roles(id: Number) {
        let result = await this.find({ id: id });
        if (result.length < 1) return;
        let user = result[0];
        return {
            id: user.id,
            admin: user.admin,
            stAGT: user.stAGT,
            stGRF: user.stGRF,
            stMA: user.stMA,
            stZUGF: user.stZUGF,
            drucker: user.drucker,
            softwareInfo: user.softwareInfo,
            telefonliste: user.telefonliste,
            kalender: user.kalender
        };
    }

    public async get_roles_all() {
        const result = await this.find();
        if (result.length < 1) return;

        let response: any = [];

        for (let i = 0; i < result.length; i++) {
            const user = result[i];

            response.push({
                id: user.id,
                admin: user.admin,
                stAGT: user.stAGT,
                stGRF: user.stGRF,
                stMA: user.stMA,
                stZUGF: user.stZUGF,
                drucker: user.drucker,
                softwareInfo: user.softwareInfo,
                telefonliste: user.telefonliste,
                kalender: user.kalender
            });
        }

        return response;
    }

    public async update_roles_admin(id: number, value: boolean) {
        let affectedRows = await UserModel.model.update(Number(id), {
            admin: value
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update_roles_admin - No rows changed');
        }
    }

    public async update_roles_stAGT(id: number, value: boolean) {
        let affectedRows = await UserModel.model.update(Number(id), {
            stAGT: value
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update_roles_stAGT - No rows changed');
        }
    }

    public async update_roles_stGRF(id: number, value: boolean) {
        let affectedRows = await UserModel.model.update(Number(id), {
            stGRF: value
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update_roles_stGRF - No rows changed');
        }
    }

    public async update_roles_stMA(id: number, value: boolean) {
        let affectedRows = await UserModel.model.update(Number(id), {
            stMA: value
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update_roles_stMA - No rows changed');
        }
    }

    public async update_roles_stZUGF(id: number, value: boolean) {
        let affectedRows = await UserModel.model.update(Number(id), {
            stZUGF: value
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update_roles_stZUGF - No rows changed');
        }
    }

    public async update_roles_drucker(id: number, value: boolean) {
        let affectedRows = await UserModel.model.update(Number(id), {
            drucker: value
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update_roles_drucker - No rows changed');
        }
    }

    public async update_roles_softwareInfo(id: number, value: boolean) {
        let affectedRows = await UserModel.model.update(Number(id), {
            softwareInfo: value
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update_roles_softwareInfo - No rows changed');
        }
    }

    public async update_roles_telefonliste(id: number, value: boolean) {
        let affectedRows = await UserModel.model.update(Number(id), {
            telefonliste: value
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update_roles_telefonliste - No rows changed');
        }
    }

    public async update_roles_kalender(id: number, value: number) {
        if (value < 0 || value > 2) {
            throw new Error(
                NAMESPACE + ' update_roles_kalender - value is less than 0 or greater than 2'
            );
        }

        let affectedRows = await UserModel.model.update(Number(id), {
            kalender: value
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update_roles_kalender - No rows changed');
        }
    }

    // Gruppen
    public async get_group(id: Number) {
        let result = await this.find({ id: id });
        if (result.length < 1) return;
        let user = result[0];
        return {
            id: user.id,
            group: user.group
        };
    }

    public async update_group(id: number, value: number) {
        let affectedRows = await UserModel.model.update(Number(id), {
            group: value
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update_roles_kalender - No rows changed');
        }
    }

    public async get_group_calendar(id: number) {
        let result = await this.find({ id: id });
        if (result.length < 1) return;
        let user = result[0];
        return {
            id: user.id,
            groups: user.kalenderGroups.split('|').map((x) => Number(x))
        };
    }

    public async update_group_calendar(id: number, value: string) {
        let affectedRows = await UserModel.model.update(Number(id), {
            kalenderGroups: value
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update_group_calendar - No rows changed');
        }
    }
}

export default new UserService();
