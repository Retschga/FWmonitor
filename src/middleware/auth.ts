'use strict';

import {
    DecodeResult,
    PartialTokenSession,
    checkPassword,
    checkToken,
    createToken
} from '../utils/security';
import { NextFunction, Request, Response } from 'express';

import { CalendarRight } from '../models/user';
import CarService from '../services/car';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import UserService from '../services/user';
import config from '../utils/config';
import logging from '../utils/logging';

const NAMESPACE = 'AUTH_MIDDLEWARE';

export const enum UserRights {
    admin = 1,
    calendar_min = 2,
    calendar_full = 3,
    telefone = 4,
    car = 5,
    ownid = 6,
    http = 7,
    praesentation = 8,
    car_list = 9
}

/**
 * Führt die App/Auto Anmeldung durch
 */
export async function login_app(
    req: Request,
    res: Response,
    next: NextFunction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Response<any, Record<string, any>> | undefined> {
    try {
        const token = req.cookies?.token;
        const telegramid = req.body.telegramid;
        const password = req.body.password;
        let userid = -1;
        let car = false;

        // Anmeldung über den JWT
        if (token && !telegramid) {
            logging.debug(NAMESPACE, 'Token Login', token);
            const decodedSession: DecodeResult = checkToken(token);

            if (decodedSession.type != 'valid') {
                throw new HttpException(
                    HttpStatusCodes.UNAUTHORIZED,
                    'Token Anmeldung nicht möglich.'
                );
            }

            userid = decodedSession.session.id;
            if (Number(userid) < 10) car = decodedSession.session.car;
            if (!decodedSession.session.isV3) userid = -1;
        }

        // Anmeldung mit Login/Passwort
        if (telegramid && password && userid == -1) {
            logging.debug(NAMESPACE, 'Passwort Login', telegramid);
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
        if (userid == -1 || isNaN(userid) || userid == undefined) {
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
            req.session.praesentation = user[0].praes;
            req.session.car_list = user[0].car_list;
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
            req.session.praesentation = false;
            req.session.name = car[0].name;
            req.session.car_list = true;
        }

        // neuen JWT erzeugen und als Cookie senden
        const tokenSession: PartialTokenSession = { id: userid, car: car, isV3: true };
        const new_token_session = createToken(tokenSession);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.cookie('token', new_token_session.token, {
            secure: true,
            path: '/',
            maxAge: config.app.jwt_expire * 1000,
            sameSite: 'strict' //boolean | 'lax' | 'strict' | 'none';  IOS Fehler, keine Ahnung warum
            //    signed?: boolean;
            //    expires?: Date;
            //  domain: config.app.enabled ? config.app.url : undefined
            //    encode?: (val: string) => string;
            // httpOnly: true,
        });

        res.cookie('car', car, {
            secure: true,
            path: '/',
            maxAge: config.app.jwt_expire * 1000
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
        req.session.praesentation = false;
        req.session.car_list = false;

        // Login Cookies löschen
        req.session.destroy(() => {
            return;
        });
        res.cookie('token', '', {
            secure: true,
            path: '/',
            maxAge: config.app.jwt_expire * 1000
            //httpOnly: true
        });
        res.cookie('car', '', {
            secure: true,
            path: '/',
            maxAge: config.app.jwt_expire * 1000
        });

        // Fehler absetzen
        if (!(e instanceof HttpException)) {
            next(new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, ''));
            return;
        }
        if (e.status != HttpStatusCodes.UNAUTHORIZED) {
            e.status = HttpStatusCodes.INTERNAL_SERVER_ERROR;
        }
        next(e);
    }
}

/**
 * Meldet debn aktuellen Session Benutzer ab
 */
export async function logout_app(
    req: Request,
    res: Response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Response<any, Record<string, any>>> {
    req.session.telegramid = undefined;
    req.session.admin = false;
    req.session.calendar_min = false;
    req.session.calendar_full = false;
    req.session.telefone = false;
    req.session.car_list = false;

    // Login Cookies löschen
    req.session.destroy(() => {
        return;
    });
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
}

/**
 * Middleware: Prüft den Anmeldestatus, sowie Berechtigungen
 */
const auth = (redirect?: string, ...roles: UserRights[]) => {
    return async function (req: Request, res: Response, next: NextFunction) {
        try {
            const session = req.session;
            let ok = false;

            // Keine Rollen angegeben -> alle
            if (roles.length == 0) ok = true;

            // Rolle angegeben -> nur freigegebene Rollen
            if (roles.indexOf(UserRights.admin) != -1 && session.admin == true) ok = true;
            if (roles.indexOf(UserRights.calendar_full) != -1 && session.calendar_full == true)
                ok = true;
            if (roles.indexOf(UserRights.calendar_min) != -1 && session.calendar_min == true)
                ok = true;
            if (roles.indexOf(UserRights.telefone) != -1 && session.telefone == true) ok = true;
            if (roles.indexOf(UserRights.car) != -1 && session.car == true) ok = true;
            if (roles.indexOf(UserRights.praesentation) != -1 && session.praesentation == true)
                ok = true;
            if (
                session.telegramid &&
                session.userid &&
                roles.indexOf(UserRights.ownid) != -1 &&
                req.params.id &&
                Number(req.params.id) == session.userid
            ) {
                ok = true;
            }
            if (roles.indexOf(UserRights.car_list) != -1 && session.car_list == true) ok = true;

            // Keine Session vorhanden -> Access denied
            if (!session.telegramid) ok = false;

            // HTTP / LAN
            if (roles.indexOf(UserRights.http) != -1 && !req.secure) ok = true;

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
            if (!(e instanceof HttpException)) {
                next(new HttpException(HttpStatusCodes.INTERNAL_SERVER_ERROR, ''));
                return;
            }
            if (e.status != HttpStatusCodes.UNAUTHORIZED) {
                e.status = HttpStatusCodes.INTERNAL_SERVER_ERROR;
            }
            next(e);
        }
    };
};

/**
 * Auth Middleware für Seiten
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function auth_page(redirect?: string, ...roles: UserRights[]) {
    return auth(redirect, ...roles);
}

/**
 * Auth Middleware für API Endpunkte
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function auth_api(...roles: UserRights[]) {
    return auth(undefined, ...roles);
}
