'use strict';

import { Request, Response } from 'express';

import { auth_page } from '../middleware/auth';
import config from '../utils/config';
import errorMiddleware from '../middleware/error';
import express from 'express';
import logging from '../utils/logging';
import mobileRoutes from './mobile/mobile';
import rateLimit from 'express-rate-limit';

const NAMESPACE = 'ROUTER_MOBILE';

const rateLimiter = rateLimit({
    windowMs: config.rateLimit.app_time * 60 * 1000, // 15 minutes
    max: config.rateLimit.app_count
});

class RouterMobile {
    public router;

    constructor() {
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
        this.router.use(rateLimiter);
        this.router.use(express.urlencoded({ extended: false }));
        this.router.use(express.json());

        /** Rules of our API */
        this.router.use((req, res, next) => {
            /* res.header('Access-Control-Allow-Origin', '*');
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
        this.router.get('/login', (req: Request, res: Response) => {
            res.render('mobile/login', { fw_name: config.common.fwName });
        });
        this.router.get('/redirect', (req: Request, res: Response) => {
            res.render('mobile/redirect');
        });

        // TODO: / -> redirect when logged in
        this.router.use('/', auth_page('/app/redirect?target=login'), mobileRoutes);

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

export default new RouterMobile().router;
