'use strict';

import express from 'express';
import logging from './utils/logging';
import errorMiddleware from './middleware/error';
import sampleRoutes from './routes/sample';

import alarmRoutes from './routes/api/alarm';
import calendarRoutes from './routes/api/calendar';
import calendarGroupRoutes from './routes/api/calendarGroup';
import carRoutes from './routes/api/car';
import userRoutes from './routes/api/user';
import statisticRoutes from './routes/api/statistic';
import groupRoutes from './routes/api/group';
import diashowRoutes from './routes/api/diashow';
import authRoutes from './routes/api/auth';
import hydrantRoutes from './routes/api/hydrant';
import deviceRoutes from './routes/api/device';
import notificationactionRoutes from './routes/api/notificationaction';
import { auth_api } from './middleware/auth';

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
            logging.info(
                NAMESPACE,
                `METHOD: [${req.method}] - URL: [${req.url}] - IP: [${req.socket.remoteAddress}]`
            );

            res.on('finish', () => {
                /** Log the res */
                logging.info(
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
            res.header('Access-Control-Allow-Origin', '*');
            res.header(
                'Access-Control-Allow-Headers',
                'Origin, X-Requested-With, Content-Type, Accept, Authorization'
            );

            if (req.method == 'OPTIONS') {
                res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
                return res.status(200).json({});
            }

            next();
        });

        /** Routes go here */

        if (this.secured) {
            // HTTPS App
            this.router.use('/auth', authRoutes);
            this.router.use('/notificationaction', notificationactionRoutes);
            this.router.use('/calendar', auth_api(), calendarRoutes);
            this.router.use('/calendarGroups', auth_api(), calendarGroupRoutes);
            this.router.use('/car', auth_api(), carRoutes);
            this.router.use('/user', auth_api(), userRoutes);
            this.router.use('/statistic', auth_api(), statisticRoutes);
            this.router.use('/alarm', auth_api(), alarmRoutes);
            this.router.use('/group', auth_api(), groupRoutes);
            this.router.use('/diashow', auth_api(), diashowRoutes);
            this.router.use('/device', auth_api(), deviceRoutes);
            this.router.use('/hydrant', auth_api(), hydrantRoutes);
            this.router.use('/', auth_api(), sampleRoutes);
        } else {
            // HTTP Bildschirm
            this.router.use('/alarm', alarmRoutes);
            this.router.use('/diashow', diashowRoutes);
            this.router.use('/calendar', calendarRoutes);
            this.router.use('/user', userRoutes);
        }

        /** Error handling */
        this.router.use(errorMiddleware);
        this.router.use((req, res, next) => {
            const error = new Error('Not found');

            res.status(404).json({
                message: error.message
            });
        });
    }
}

export default RouterApi;
