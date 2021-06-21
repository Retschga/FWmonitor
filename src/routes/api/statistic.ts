'use strict';

import express from 'express';
import statisticController from '../../controllers/statistic';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import { auth_api, UserRights } from '../../middleware/auth';

const router = express.Router();

router.get('/:year', awaitHandlerFactory(statisticController.get_year.bind(statisticController)));
router.get(
    '/time/:id/:year',
    awaitHandlerFactory(statisticController.get_einsatzzeit.bind(statisticController))
);
router.get(
    '/list/:year',
    auth_api(UserRights.admin),
    awaitHandlerFactory(statisticController.get_einsatzzeit_all.bind(statisticController))
);
export = router;
