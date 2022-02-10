'use strict';

import alarmRoutes from './api/alarm';
import authRoutes from './api/auth';
import { auth_api } from '../middleware/auth';
import calendarGroupRoutes from './api/calendarGroup';
import calendarRoutes from './api/calendar';
import carRoutes from './api/car';
import config from '../utils/config';
import contactRoutes from './api/contact';
import deviceRoutes from './api/device';
import diashowRoutes from './api/diashow';
import errorMiddleware from '../middleware/error';
import express from 'express';
import groupRoutes from './api/group';
import hydrantRoutes from './api/hydrant';
import logging from '../utils/logging';
import mapRoutes from './api/map';
import notificationactionRoutes from './api/notificationaction';
import praesentationRoutes from './api/praesentation';
import rateLimit from 'express-rate-limit';
import statisticRoutes from './api/statistic';
import userRoutes from './api/user';

const loginAccountLimiter = rateLimit({
    windowMs: config.rateLimit.api_login_time * 60 * 1000,
    max: config.rateLimit.api_login_count, // start blocking after 5 requests
    message: JSON.stringify({
        message: 'Too many logins from this IP, please try again after an 10minutes'
    })
});
const apiLimiter = rateLimit({
    windowMs: config.rateLimit.api_time * 60 * 1000, // 15 minutes
    max: config.rateLimit.api_count
});
const diashowLimiter = rateLimit({
    windowMs: config.rateLimit.api_time * 60 * 1000, // 15 minutes
    max: config.rateLimit.api_count_diashow
});

const NAMESPACE = 'ROUTER_API';

class RouterApi {
    public router;
    private secured;

    constructor(secured: boolean) {
        this.secured = secured;
        this.router = express.Router();
        this.mountRoutes();
    }

    private mountRoutes() {
        /** Log the request */
        this.router.use((req, res, next) => {
            /** Log the req */
            logging.debug(
                NAMESPACE,
                `METHOD: [${req.method}] - URL: [${req.url}] - IP: [${req.socket.remoteAddress}]`
            );

            res.on('finish', () => {
                /** Log the res */
                logging.debug(
                    NAMESPACE,
                    `METHOD: [${req.method}] - URL: [${req.url}] - STATUS: [${res.statusCode}] - IP: [${req.socket.remoteAddress}]`
                );
            });

            next();
        });

        /** Parse the body of the request */
        this.router.use(express.urlencoded({ extended: false }));
        this.router.use(express.json());

        /** Rules of our API */
        this.router.use((req, res, next) => {
            /*             res.header('Access-Control-Allow-Origin', '*');
            res.header(
                'Access-Control-Allow-Headers',
                'Origin, X-Requested-With, Content-Type, Accept, Authorization'
            ); */

            if (req.method == 'OPTIONS') {
                res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
                return res.status(200).json({});
            }

            next();
        });

        /** Routes go here */

        if (this.secured) {
            // HTTPS App
            this.router.use('/auth', loginAccountLimiter, authRoutes);
            this.router.use('/notificationaction', apiLimiter, notificationactionRoutes);
            this.router.use('/calendar', apiLimiter, auth_api(), calendarRoutes);
            this.router.use('/calendarGroups', apiLimiter, auth_api(), calendarGroupRoutes);
            this.router.use('/car', apiLimiter, auth_api(), carRoutes);
            this.router.use('/user', apiLimiter, auth_api(), userRoutes);
            this.router.use('/statistic', apiLimiter, auth_api(), statisticRoutes);
            this.router.use('/alarm', apiLimiter, auth_api(), alarmRoutes);
            this.router.use('/group', apiLimiter, auth_api(), groupRoutes);
            this.router.use('/diashow', diashowLimiter, auth_api(), diashowRoutes);
            this.router.use('/device', apiLimiter, auth_api(), deviceRoutes);
            this.router.use('/hydrant', apiLimiter, auth_api(), hydrantRoutes);
            this.router.use('/praesentation', apiLimiter, auth_api(), praesentationRoutes);
            this.router.use('/contact', apiLimiter, auth_api(), contactRoutes);
            this.router.use('/map', apiLimiter, auth_api(), mapRoutes);
        } else {
            // HTTP Bildschirm
            this.router.use('/alarm', alarmRoutes);
            this.router.use('/diashow', diashowRoutes);
            this.router.use('/calendar', calendarRoutes);
            this.router.use('/praesentation', praesentationRoutes);
            this.router.use('/user', userRoutes);
            this.router.use('/hydrant', apiLimiter, hydrantRoutes);
            this.router.use('/map', mapRoutes);
        }

        /** Error handling */
        this.router.use(errorMiddleware);
        this.router.use((req, res) => {
            const error = new Error('Not found');

            res.status(404).json({
                message: error.message
            });
        });
    }
}

export default RouterApi;
