import { Request, Response, NextFunction } from 'express';
import UserService from '../services/user';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import CarService from '../services/car';

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
    car,
    ownid
}

export const login_app = async function (req: Request, res: Response, next: NextFunction) {
    try {
        const token = req.cookies?.token;
        const telegramid = req.body.telegramid;
        const password = req.body.password;
        let userid = -1;
        let car = false;

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
            let login;
            if (telegramid.length > 4 && telegramid.substring(0, 4) == 'AUTO') {
                login = await CarService.get_login_carid(telegramid);
                car = true;
            } else {
                login = await UserService.get_login_telegramid(telegramid);
                car = false;
            }

            if (!login || !login.passwordHash || login.passwordHash == '') {
                throw new HttpException(HttpStatusCodes.UNAUTHORIZED, 'Access denied.1');
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

        if (!car) {
            // Starte neue Session
            const user = await UserService.find_by_userid(userid);

            if (!user || user.length < 1) {
                throw new HttpException(HttpStatusCodes.UNAUTHORIZED, 'Access denied.2');
            }

            // Alles OK -> Session Setup
            req.session.userid = user[0].id;
            req.session.telegramid = user[0].telegramid;
            req.session.admin = user[0].admin;
            req.session.calendar_min = user[0].kalender == CalendarRight.MIN;
            req.session.calendar_full = user[0].kalender == CalendarRight.FULL;
            req.session.telefone = user[0].telefonliste;
            req.session.car = false;
        } else {
            // Starte neue Session
            const car = await CarService.find_by_id(userid);

            if (!car || car.length < 1) {
                throw new HttpException(HttpStatusCodes.UNAUTHORIZED, 'Access denied.3');
            }

            // Alles OK -> Session Setup
            req.session.userid = car[0].id;
            req.session.telegramid = 'car' + car[0].id;
            req.session.admin = false;
            req.session.calendar_min = false;
            req.session.calendar_full = false;
            req.session.telefone = true;
            req.session.car = true;
        }

        // JWT erzeugen und als Cookie senden
        const tokenSession: PartialTokenSession = { id: userid };
        const new_token_session = createToken(tokenSession);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.cookie('token', new_token_session.token, {
            secure: true,
            path: '/',
            maxAge: config.app.jwt_expire
        });

        res.cookie('car', car, {
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
        req.session.car = false;

        // Login Cookies löschen
        req.session.destroy(() => {});
        res.cookie('token', '', {
            secure: true,
            path: '/',
            maxAge: config.app.jwt_expire * 1000
        });
        res.cookie('car', '', {
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
    /*
    res.cookie('token', '', {
        secure: true,
        path: '/',
        maxAge: config.app.jwt_expire * 1000
    });
*/
    // Antwort senden
    return res.status(200).send({
        message: 'OK'
    });
};

const auth = (redirect?: string, ...roles: UserRights[]) => {
    return async function (req: Request, res: Response, next: NextFunction) {
        try {
            const session = req.session;
            let ok = false;

            // Keine Rollen angegeben -> alle
            if (roles.length == 0) ok = true;

            // Rolle angegeben -> nur freigegebene Rollen
            if (UserRights.admin in roles && session.admin == true) ok = true;
            if (UserRights.calendar_full in roles && session.calendar_full == true) ok = true;
            if (UserRights.calendar_min in roles && session.calendar_min == true) ok = true;
            if (UserRights.telefone in roles && session.telefone == true) ok = true;
            if (UserRights.car in roles && session.car == true) ok = true;
            if (
                session.telegramid &&
                session.userid &&
                UserRights.ownid in roles &&
                req.params.id &&
                Number(req.params.id) == session.userid
            ) {
                ok = true;
            }

            // Keine Session vorhanden -> Access denied
            if (!session.telegramid) ok = false;

            if (ok == true) {
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
