import { Request, Response, NextFunction } from 'express';
import UserService from '../services/user';
import cookieParser from 'cookie-parser';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';

export enum roles {
    admin,
    kalender_1
}

export const login = async function (req: Request, res: Response, next: NextFunction) {
    try {
        const session = req.session;
        const cookies = req.cookies;
        const token = cookies.token;
        const telegramid = req.body.telegramid;
        const password = req.body.password;

        if (token && !telegramid) {
            // Anmeldung über den JWT
            return;
        }

        if (telegramid && password) {
            // Anmeldung mit Login/Passwort
            return;
        }

        throw new HttpException(
            HttpStatusCodes.UNAUTHORIZED,
            'Access denied. No credentials sent!'
        );

        //next();
    } catch (e) {
        e.status = 401;
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
