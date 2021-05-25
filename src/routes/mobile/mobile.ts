'use strict';

import express from 'express';
import { Request, Response, NextFunction } from 'express';

const router = express.Router();

router.get('/login', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/login');
});

router.get('/index', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/index');
});

router.get('/redirect', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/redirect');
});

router.get('/calendar', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/calendar');
});

router.get('/status', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/status');
});

router.get('/map', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/map');
});

router.get('/alarm_list', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/alarm_list');
});

router.get('/menu', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/menu');
});

router.get('/statistic', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/statistic');
});

router.get('/map', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/map');
});

router.get('/alarmsettings', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/alarmsettings');
});

router.get('/presentation', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/presentation');
});

router.get('/picturesdiashow', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/picturesdiashow');
});

router.get('/settings_user', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/settings_user');
});

router.get('/settings_alarm', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/settings_alarm');
});

router.get('/user_list', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/user_list');
});

router.get('/user', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/user');
});

router.get('/car_list', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/car_list');
});

router.get('/calendar_groups', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/calendar_groups');
});

router.get('/alarm_groups', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/alarm_groups');
});

router.get('/device_list', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/device_list');
});

router.get('/alarm', (req: Request, res: Response, next: NextFunction) => {
    res.render('mobile/alarm');
});

export = router;
