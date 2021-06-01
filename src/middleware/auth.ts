import { Request, Response, NextFunction } from 'express';
import UserService from '../services/user';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';

import {
    checkPassword,
    createToken,
    checkToken,
    DecodeResult,
    PartialTokenSession
} from '../utils/security';
import config from '../utils/config';
import { CalendarRight } from '../models/user';

export enum UserRights {
    admin,
    calendar_min,
    calendar_full,
    telefone,
    ownid
}

export const login_app = async function (req: Request, res: Response, next: NextFunction) {
    try {
        const token = req.cookies?.token;
        const telegramid = req.body.telegramid;
        const password = req.body.password;
        let userid = -1;

        // Anmeldung über den JWT
        if (token && !telegramid) {
            const decodedSession: DecodeResult = checkToken(token);

            if (decodedSession.type != 'valid') {
                throw new HttpException(
                    HttpStatusCodes.UNAUTHORIZED,
                    'Token Anmeldung nicht möglich.'
                );
            }

            userid = decodedSession.session.id;
        }

        // Anmeldung mit Login/Passwort
        if (telegramid && password && userid == -1) {
            const login = await UserService.get_login_telegramid(telegramid);

            if (!login || !login.passwordHash || login.passwordHash == '') {
                throw new HttpException(HttpStatusCodes.UNAUTHORIZED, 'Access denied.');
            }

            const response = checkPassword(password, login.passwordHash);

            if (!response) {
                throw new HttpException(
                    HttpStatusCodes.UNAUTHORIZED,
                    'Username or password wrong.'
                );
            }

            userid = login.id;
        }

        // Error
        if (userid == -1) {
            throw new HttpException(
                HttpStatusCodes.UNAUTHORIZED,
                'Access denied. No credentials sent!'
            );
        }

        // Starte neue Session
        const user = await UserService.find_by_userid(userid);

        if (!user || user.length < 1) {
            throw new HttpException(HttpStatusCodes.UNAUTHORIZED, 'Access denied.');
        }

        // Alles OK -> Session Setup
        req.session.userid = user[0].id;
        req.session.telegramid = user[0].telegramid;
        req.session.admin = user[0].admin;
        req.session.calendar_min = user[0].kalender == CalendarRight.MIN;
        req.session.calendar_full = user[0].kalender == CalendarRight.FULL;
        req.session.telefone = user[0].telefonliste;

        // JWT erzeugen und als Cookie senden
        const tokenSession: PartialTokenSession = { id: userid };
        const new_token = createToken(tokenSession);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.cookie('token', new_token, {
            secure: true,
            path: '/',
            maxAge: config.app.jwt_expire
        });

        // Antwort senden
        return res.status(200).send({
            message: 'OK'
        });

        //next();
    } catch (e) {
        req.session.telegramid = undefined;
        req.session.admin = false;
        req.session.calendar_min = false;
        req.session.calendar_full = false;
        req.session.telefone = false;

        // Login Cookies löschen
        req.session.destroy(() => {});
        res.cookie('token', '', {
            secure: true,
            path: '/',
            maxAge: config.app.jwt_expire * 1000
        });

        // Fehler absetzen
        if (e.status != HttpStatusCodes.UNAUTHORIZED) {
            e.status = HttpStatusCodes.INTERNAL_SERVER_ERROR;
        }
        next(e);
    }
};

export const logout_app = async function (req: Request, res: Response, next: NextFunction) {
    req.session.telegramid = undefined;
    req.session.admin = false;
    req.session.calendar_min = false;
    req.session.calendar_full = false;
    req.session.telefone = false;

    // Login Cookies löschen
    req.session.destroy(() => {});
    res.cookie('token', '', {
        secure: true,
        path: '/',
        maxAge: config.app.jwt_expire * 1000
    });

    // Antwort senden
    return res.status(200).send({
        message: 'OK'
    });
};

const auth = (redirect?: string, ...roles: UserRights[]) => {
    return async function (req: Request, res: Response, next: NextFunction) {
        try {
            const session = req.session;
            let ok = true;

            if (!session.telegramid) ok = false;
            if (UserRights.admin in roles && session.admin != true) ok = false;
            if (UserRights.calendar_full in roles && session.calendar_full != true) ok = false;
            if (UserRights.calendar_min in roles && session.calendar_min != true) ok = false;
            if (UserRights.telefone in roles && session.telefone != true) ok = false;

            if (
                session.telegramid &&
                session.userid &&
                UserRights.ownid in roles &&
                req.params.id &&
                Number(req.params.id) == session.userid
            ) {
                ok = true;
            }

            if (ok) {
                next();
                return;
            }

            if (redirect) {
                res.redirect(redirect);
                return;
            }
            throw new HttpException(HttpStatusCodes.UNAUTHORIZED, 'Access denied.');
        } catch (e) {
            // Fehler absetzen
            if (e.status != HttpStatusCodes.UNAUTHORIZED) {
                e.status = HttpStatusCodes.INTERNAL_SERVER_ERROR;
            }
            next(e);
        }
    };
};

export const auth_page = (redirect?: string, ...roles: UserRights[]) => {
    return auth(redirect, ...roles);
};

export const auth_api = (...roles: UserRights[]) => {
    return auth(undefined, ...roles);
};
