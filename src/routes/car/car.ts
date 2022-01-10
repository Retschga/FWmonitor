'use strict';

import { Request, Response } from 'express';

import config from '../../utils/config';
import express from 'express';

const router = express.Router();

function generateParams() {
    return {
        fwvv: config.fwvv.enabled,
        fw_name: config.common.fwName,
        fw_name_short: config.common.fwName_short,
        version: config.version,
        fw_position: config.common.fw_position
    };
}

router.get('/manifest.json', (req: Request, res: Response) => {
    res.render('car/manifest', generateParams());
});

router.get('/redirect', (req: Request, res: Response) => {
    res.render('car/redirect', generateParams());
});

router.get('/', (req: Request, res: Response) => {
    res.redirect('index?name=' + req.query.name);
});

router.get('/index', (req: Request, res: Response) => {
    res.render('car/index', generateParams());
});

router.get('/offline', (req: Request, res: Response) => {
    res.render('car/offline', generateParams());
});

router.get('/menu', (req: Request, res: Response) => {
    res.render('car/menu', generateParams());
});

router.get('/alarm_list', (req: Request, res: Response) => {
    res.render('car/alarm_list', generateParams());
});

router.get('/alarm', (req: Request, res: Response) => {
    res.render('car/alarm', generateParams());
});

router.get('/funk', (req: Request, res: Response) => {
    res.render('car/funk', generateParams());
});

router.get('/gps', (req: Request, res: Response) => {
    res.render('car/gps', generateParams());
});

router.get('/telefone', (req: Request, res: Response) => {
    res.render('car/telefone', generateParams());
});

export = router;
