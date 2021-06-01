'use strict';

import express from 'express';
import deviceController from '../../controllers/device';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';

const router = express.Router();

router.get('/all', awaitHandlerFactory(deviceController.get_all.bind(deviceController)));

export = router;
