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
        version: config.version
    };
}

router.get('/', (req: Request, res: Response, next: NextFunction) => {
    console.log(generateParams(req));
    res.render('screen/index', generateParams(req));
});

router.get('/index', (req: Request, res: Response, next: NextFunction) => {
    console.log(generateParams(req));
    res.render('screen/index', generateParams(req));
});

export = router;
