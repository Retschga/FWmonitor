'use strict';

import express from 'express';
import contactController from '../../controllers/contact';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import { auth_api, UserRights } from '../../middleware/auth';

const router = express.Router();

router.get(
    '/all',
    auth_api(UserRights.telefone),
    awaitHandlerFactory(contactController.get_all.bind(contactController))
);

export = router;
