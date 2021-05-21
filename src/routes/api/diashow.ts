'use strict';

import express from 'express';
import DiashowController from '../../controllers/diashow';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import * as ValidatorDiashow from '../../middleware/diashowValidator';
import config from '../../utils/config';

const router = express.Router();

router.get('/list', awaitHandlerFactory(DiashowController.get_list.bind(DiashowController)));

router.post(
    '/enable',
    ValidatorDiashow.enable_pic,
    awaitHandlerFactory(DiashowController.enable_pic.bind(DiashowController))
);

router.post(
    '/disable',
    ValidatorDiashow.disable_pic,
    awaitHandlerFactory(DiashowController.disable_pic.bind(DiashowController))
);

router.post(
    '/delete',
    ValidatorDiashow.delete_pic,
    awaitHandlerFactory(DiashowController.delete_pic.bind(DiashowController))
);

router.get('/files/:file', async function (req, res) {
    res.sendFile(config.folders.thumbnailPrefix + req.params.file, {
        root: config.folders.diashow
    });
});

export = router;
