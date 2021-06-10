'use strict';

import express from 'express';
import PraesentationController from '../../controllers/praesentation';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import config from '../../utils/config';
import { auth_api, UserRights } from '../../middleware/auth';

const router = express.Router();

router.get(
    '/list',
    auth_api(UserRights.admin, UserRights.praesentation),
    awaitHandlerFactory(PraesentationController.get_list.bind(PraesentationController))
);

router.get('/files/:file', auth_api(UserRights.http), async function (req, res) {
    res.sendFile(req.params.file, {
        root: config.folders.praesentation
    });
});

export = router;
