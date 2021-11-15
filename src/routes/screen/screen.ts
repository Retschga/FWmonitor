'use strict';

import { Request, Response } from 'express';

import config from '../../utils/config';
import express from 'express';

const router = express.Router();

function generateParams() {
    return {
        version: config.version,

        fwvv: config.fwvv.enabled,
        fwname: config.common.fwName,

        time_diashow: config.screen.screen_time_diashow,
        imagedate_diashow: config.screen.screen_imagedate_diashow,

        dwd_warncellid: config.common.dwd_warncellid,
        dwd_position: config.screen.screen_pos_dwd,

        calendar_position: config.screen.screen_pos_calendar,

        show_verf: config.screen.screen_verf,
        show_nverf: config.screen.screen_nverf,

        time_alarm: config.common.time_alarm
    };
}

router.get('/', (req: Request, res: Response) => {
    res.redirect('screen/index?name=' + req.query.name);
});

router.get('/index', (req: Request, res: Response) => {
    res.render('screen/index', generateParams());
});

router.get('/alarm', (req: Request, res: Response) => {
    res.render('screen/alarm', generateParams());
});

router.get('/praesentation', (req: Request, res: Response) => {
    res.render('screen/praesentation', generateParams());
});

export = router;
