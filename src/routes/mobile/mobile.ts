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
        version: config.version,
        vapid_public: config.app.vapid_public
    };
}

router.get('/manifest.json', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/manifest', generateParams(req));
});

router.get('/index', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/index', generateParams(req));
});
router.get('/index.html', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/index', generateParams(req));
});

router.get('/calendar', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/calendar', generateParams(req));
});

router.get('/status', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/status', generateParams(req));
});

router.get('/status_plan', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/status_plan', generateParams(req));
});

router.get('/status_plan_list', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/status_plan_list', generateParams(req));
});

router.get('/map', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/map', generateParams(req));
});

router.get('/alarm_list', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/alarm_list', generateParams(req));
});

router.get('/menu', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/menu', generateParams(req));
});

router.get('/statistic', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/statistic', generateParams(req));
});

router.get('/map', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/map', generateParams(req));
});

router.get('/alarmsettings', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/alarmsettings', generateParams(req));
});

router.get('/presentation', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/presentation', generateParams(req));
});

router.get('/picturesdiashow', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/picturesdiashow', generateParams(req));
});

router.get('/settings_user', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/settings_user', generateParams(req));
});

router.get('/settings_alarm', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/settings_alarm', generateParams(req));
});

router.get('/user_list', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/user_list', generateParams(req));
});

router.get('/user', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/user', generateParams(req));
});

router.get('/car_list', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/car_list', generateParams(req));
});

router.get('/calendar_groups', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/calendar_groups', generateParams(req));
});

router.get('/calendar_entry', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/calendar_entry', generateParams(req));
});

router.get('/alarm_groups', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/alarm_groups', generateParams(req));
});

router.get('/device_list', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/device_list', generateParams(req));
});

router.get('/alarm', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/alarm', generateParams(req));
});

router.get('/offline', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/offline', generateParams(req));
});

export = router;
