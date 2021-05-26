'use strict';

import express from 'express';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import { login } from '../../middleware/auth';

const router = express.Router();

router.post('/login', awaitHandlerFactory(login));

export = router;
