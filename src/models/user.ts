'use strict';

import Model from './model';
import webpush from 'web-push';

const NAMESPACE = 'UserModel';
const TABLENAME = 'users';

enum UserApproved {
    BLOCKED = 0,
    APPROVED = 1
}
enum UserStatus {
    TELEGR_USER_DISABLED = -2,
    TELEGR_BOT_BLOCKED = -1,
    VERFUEGBAR = 1,
    NICHT_VERFUEGBAR = 2
}
enum CalendarRight {
    READ = 0,
    MIN = 1,
    FULL = 2
}

interface UserRow {
    id: number;
    approved: UserApproved;
    telegramid: string;
    name: string;
    vorname: string;
    status: UserStatus;
    statusUntil: string;
    statusPlans: string;
    statusHidden: boolean;
    kalenderGroups: string;
    sendRemembers: boolean;
    appPasswort: string;
    appNotifications: number;
    appNotificationsSubscription: string;
    group: number;

    admin: boolean;
    stAGT: boolean;
    stGRF: boolean;
    stMA: boolean;
    stZUGF: boolean;
    drucker: boolean;
    softwareInfo: boolean;
    telefonliste: boolean;
    kalender: CalendarRight;
}

class UserModel extends Model {
    constructor() {
        super(TABLENAME);
    }

    /**
     * Findet einen Eintrag anhand der Suchparameter
     * @param params //{spalte: wert, ...}
     * @returns {Promise<undefined | CalendarRow[]}
     */
    public async find(params: object = {}): Promise<UserRow[]> {
        return await super.findElement<UserRow>(params);
    }
}

const model = new UserModel();

export { UserApproved, UserStatus, UserRow, CalendarRight, model };
