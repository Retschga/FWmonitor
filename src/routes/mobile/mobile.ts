'use strict';

import express from 'express';
import { Request, Response } from 'express';
import config from '../../utils/config';

const router = express.Router();

function generateParams() {
    return {
        fwvv: config.fwvv.enabled,
        fw_name: config.common.fwName,
        fw_name_short: config.common.fwName_short,
        version: config.version,
        vapid_public: config.app.vapid_public
    };
}

router.get('/manifest.json', (req: Request, res: Response) => {
    res.render('mobile/manifest', generateParams());
});

router.get('/index', (req: Request, res: Response) => {
    res.render('mobile/index', generateParams());
});
router.get('/index.html', (req: Request, res: Response) => {
    res.render('mobile/index', generateParams());
});

router.get('/calendar', (req: Request, res: Response) => {
    res.render('mobile/calendar', generateParams());
});

router.get('/status', (req: Request, res: Response) => {
    res.render('mobile/status', generateParams());
});

router.get('/status_plan', (req: Request, res: Response) => {
    res.render('mobile/status_plan', generateParams());
});

router.get('/status_plan_list', (req: Request, res: Response) => {
    res.render('mobile/status_plan_list', generateParams());
});

router.get('/map', (req: Request, res: Response) => {
    res.render('mobile/map', generateParams());
});

router.get('/alarm_list', (req: Request, res: Response) => {
    res.render('mobile/alarm_list', generateParams());
});

router.get('/menu', (req: Request, res: Response) => {
    res.render('mobile/menu', generateParams());
});

router.get('/statistic', (req: Request, res: Response) => {
    res.render('mobile/statistic', generateParams());
});

router.get('/map', (req: Request, res: Response) => {
    res.render('mobile/map', generateParams());
});

router.get('/alarmsettings', (req: Request, res: Response) => {
    res.render('mobile/alarmsettings', generateParams());
});

router.get('/presentation', (req: Request, res: Response) => {
    res.render('mobile/presentation', generateParams());
});

router.get('/picturesdiashow', (req: Request, res: Response) => {
    res.render('mobile/picturesdiashow', generateParams());
});

router.get('/settings_user', (req: Request, res: Response) => {
    res.render('mobile/settings_user', generateParams());
});

router.get('/settings_alarm', (req: Request, res: Response) => {
    res.render('mobile/settings_alarm', generateParams());
});

router.get('/user_list', (req: Request, res: Response) => {
    res.render('mobile/user_list', generateParams());
});

router.get('/user', (req: Request, res: Response) => {
    res.render('mobile/user', generateParams());
});

router.get('/car_list', (req: Request, res: Response) => {
    res.render('mobile/car_list', generateParams());
});

router.get('/calendar_groups', (req: Request, res: Response) => {
    res.render('mobile/calendar_groups', generateParams());
});

router.get('/calendar_entry', (req: Request, res: Response) => {
    res.render('mobile/calendar_entry', generateParams());
});

router.get('/calendar_history', (req: Request, res: Response) => {
    res.render('mobile/calendar_history', generateParams());
});

router.get('/alarm_groups', (req: Request, res: Response) => {
    res.render('mobile/alarm_groups', generateParams());
});

router.get('/device_list', (req: Request, res: Response) => {
    res.render('mobile/device_list', generateParams());
});

router.get('/alarm', (req: Request, res: Response) => {
    res.render('mobile/alarm', generateParams());
});

router.get('/offline', (req: Request, res: Response) => {
    res.render('mobile/offline', generateParams());
});
router.get('/picture_upload', (req: Request, res: Response) => {
    res.render('mobile/picture_upload', generateParams());
});
router.get('/phonebook', (req: Request, res: Response) => {
    res.render('mobile/phonebook', generateParams());
});
router.get('/einsatzzeit', (req: Request, res: Response) => {
    res.render('mobile/einsatzzeit', generateParams());
});

export = router;
