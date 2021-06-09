'use strict';

import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { Session } from 'express-session';
import config from '../../utils/config';

const router = express.Router();

function generateParams(req: Request) {
    return {
        version: config.version,

        fwvv: config.fwvv.enabled,
        fwname: config.common.fwName,

        time_diashow: config.screen.screen_time_diashow,

        dwd_warncellid: config.common.dwd_warncellid,
        dwd_position: config.screen.screen_pos_dwd,

        calendar_position: config.screen.screen_pos_calendar,

        show_verf: config.screen.screen_verf,
        show_nferf: config.screen.screen_nverf,

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
