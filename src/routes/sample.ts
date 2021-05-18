'use strict';

import express from 'express';
import controller from '../controllers/sample';

const router = express.Router();

router.get('/serverstatus', controller.sampleHealthCheck);

export = router;
