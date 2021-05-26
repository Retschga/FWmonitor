import { Request, Response, NextFunction } from 'express';
import UserService from '../services/user';
import cookieParser from 'cookie-parser';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import jsonwebtoken from 'jsonwebtoken';
import { checkPassword, createToken } from '../utils/security';
import config from '../utils/config';
import { CalendarRight } from '../models/user';

export enum roles {
    admin,
    kalender_1
}

export const login = async function (req: Request, res: Response, next: NextFunction) {
    try {
        const token = req.cookies?.token;
        const telegramid = req.body.telegramid;
        const password = req.body.password;

        if (token && !telegramid) {
            // Anmeldung über den JWT
            return;
        }

        if (telegramid && password) {
            // Anmeldung mit Login/Passwort

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

            const user = await UserService.find_by_userid(login.id);

            if (!user || user.length < 1) {
                throw new HttpException(HttpStatusCodes.UNAUTHORIZED, 'Access denied.');
            }

            // Alles OK
            req.session.telegramid = telegramid;
            req.session.admin = user[0].admin;
            req.session.calendar_min = user[0].kalender == CalendarRight.MIN;
            req.session.calendar_full = user[0].kalender == CalendarRight.FULL;
            req.session.telefone = user[0].telefonliste;

            const token = createToken(telegramid);
            res.header('Access-Control-Allow-Credentials', 'true');
            res.cookie('token', token, {
                secure: true,
                path: '/',
                maxAge: config.app.jwt_expire
            });

            // Antwort senden
            return res.status(200).send({
                message: 'OK'
            });
        }

        throw new HttpException(
            HttpStatusCodes.UNAUTHORIZED,
            'Access denied. No credentials sent!'
        );

        //next();
    } catch (e) {
        // Login Cookies löschen
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

export const auth = (...roles: roles[]) => {
    return async function (req: Request, res: Response, next: NextFunction) {
        try {
            const session = req.session;
            const telegramid = session.telegramid;

            if (telegramid) {
                // TODO Check for roles

                next();
            } else {
                res.status(401).render('appRedirect', {
                    page: '',
                    data: {}
                });
                //res.redirect('/app/login.html');
            }
        } catch (e) {
            e.status = 401;
            next(e);
        }
    };
};
