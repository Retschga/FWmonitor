'use strict';

import express from 'express';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import { login_app, logout_app } from '../../middleware/auth';

const router = express.Router();

router.post('/login', awaitHandlerFactory(login_app));
router.post('/logout', awaitHandlerFactory(logout_app));

export = router;
