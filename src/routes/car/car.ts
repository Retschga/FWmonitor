'use strict';

import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { Session } from 'express-session';
import config from '../../utils/config';

const router = express.Router();

function generateParams(req: Request) {
    return {
        fwvv: config.fwvv.enabled,
        fw_name: config.common.fwName,
        fw_name_short: config.common.fwName_short,
        version: config.version
    };
}

router.get('/manifest.json', (req: Request, res: Response, next: NextFunction) => {
    res.render('car/manifest', generateParams(req));
});

router.get('/redirect', (req: Request, res: Response, next: NextFunction) => {
    res.render('car/redirect', generateParams(req));
});

router.get('/index', (req: Request, res: Response, next: NextFunction) => {
    res.render('car/index', generateParams(req));
});

router.get('/offline', (req: Request, res: Response, next: NextFunction) => {
    res.render('car/offline', generateParams(req));
});

router.get('/menu', (req: Request, res: Response, next: NextFunction) => {
    res.render('car/menu', generateParams(req));
});

router.get('/alarm_list', (req: Request, res: Response, next: NextFunction) => {
    res.render('car/alarm_list', generateParams(req));
});

router.get('/alarm', (req: Request, res: Response, next: NextFunction) => {
    res.render('car/alarm', generateParams(req));
});

export = router;
