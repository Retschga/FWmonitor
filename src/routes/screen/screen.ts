'use strict';

import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { Session } from 'express-session';
import config from '../../utils/config';

const router = express.Router();

function generateParams(req: Request) {
    return {
        fwvv: config.fwvv.enabled,
        fwname: config.common.fwName,
        dwd_warncellid: config.common.dwd_warncellid,
        version: config.version,
        time_diashow: config.common.time_diashow,
        time_alarm: config.common.time_alarm
    };
}

router.get('/', (req: Request, res: Response, next: NextFunction) => {
    res.render('screen/index', generateParams(req));
});

router.get('/index', (req: Request, res: Response, next: NextFunction) => {
    res.render('screen/index', generateParams(req));
});

router.get('/alarm', (req: Request, res: Response, next: NextFunction) => {
    res.render('screen/alarm', generateParams(req));
});

export = router;
