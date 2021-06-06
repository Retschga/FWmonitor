'use strict';

import express from 'express';
import logging from './utils/logging';
import errorMiddleware from './middleware/error';
import sampleRoutes from './routes/sample';
import { Request, Response, NextFunction } from 'express';

import carRoutes from './routes/car/car';
import { auth_page } from './middleware/auth';

const NAMESPACE = 'ROUTER_CAR';

class RouterCar {
    public router;

    constructor() {
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
        this.router.get('/login', (req: Request, res: Response, next: NextFunction) => {
            res.render('car/login');
        });
        this.router.get('/redirect', (req: Request, res: Response, next: NextFunction) => {
            res.render('car/redirect');
        });
        this.router.get('/settings', (req: Request, res: Response, next: NextFunction) => {
            res.render('car/settings');
        });

        this.router.use('/', sampleRoutes);
        this.router.use('/', auth_page('/car/redirect?target=login'), carRoutes);

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

export default new RouterCar().router;
