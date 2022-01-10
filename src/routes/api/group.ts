'use strict';

import express from 'express';
import groupController from '../../controllers/group';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import * as ValidatorsGroup from '../../middleware/groupValidator';
import { auth_api, UserRights } from '../../middleware/auth';

const router = express.Router();

router.get(
    '/',
    auth_api(UserRights.admin),
    awaitHandlerFactory(groupController.get_list_all.bind(groupController))
);
router.post(
    '/:id',
    auth_api(UserRights.admin),
    ValidatorsGroup.updateGroup,
    awaitHandlerFactory(groupController.update_id.bind(groupController))
);

export = router;
