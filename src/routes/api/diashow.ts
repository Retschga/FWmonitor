'use strict';

import express from 'express';
import DiashowController from '../../controllers/diashow';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import * as ValidatorDiashow from '../../middleware/diashowValidator';
import config from '../../utils/config';
import { auth_api, UserRights } from '../../middleware/auth';
import multer from 'multer';
import diashowService from '../../services/diashow';
import { italic } from 'colors/safe';

const router = express.Router();
const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, config.folders.temp);
        },
        filename: function (req, file, cb) {
            cb(null, new Date().valueOf() + '_' + file.originalname);
        }
    })
});

router.get(
    '/list',
    auth_api(UserRights.admin, UserRights.http),
    awaitHandlerFactory(DiashowController.get_list.bind(DiashowController))
);

router.post(
    '/enable',
    auth_api(UserRights.admin),
    ValidatorDiashow.enable_pic,
    awaitHandlerFactory(DiashowController.enable_pic.bind(DiashowController))
);

router.post(
    '/disable',
    auth_api(UserRights.admin),
    ValidatorDiashow.disable_pic,
    awaitHandlerFactory(DiashowController.disable_pic.bind(DiashowController))
);

router.post(
    '/delete',
    auth_api(UserRights.admin),
    ValidatorDiashow.delete_pic,
    awaitHandlerFactory(DiashowController.delete_pic.bind(DiashowController))
);

router.get(
    '/files/full/:file',
    auth_api(UserRights.admin, UserRights.http),
    async function (req, res) {
        res.sendFile(req.params.file, {
            root: config.folders.diashow
        });
    }
);

router.get('/files/:file', auth_api(UserRights.admin, UserRights.http), async function (req, res) {
    res.sendFile(config.folders.thumbnailPrefix + req.params.file, {
        root: config.folders.diashow
    });
});

router.post('/upload', upload.single('image'), function (req, res, next) {
    if (req.file == undefined) {
        res.send('error');
        return;
    }
    diashowService.process_new(config.folders.temp, req.file.filename);
    res.send('OK');
});

export = router;
