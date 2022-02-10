'use strict';

import * as ValidatorsGroup from '../../middleware/groupValidator';

import { UserRights, auth_api } from '../../middleware/auth';

import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import express from 'express';
import usergroupController from '../../controllers/userGroup';

const router = express.Router();

router.get(
    '/',
    auth_api(UserRights.admin),
    awaitHandlerFactory(usergroupController.get_list_all.bind(usergroupController))
);
router.post(
    '/:id',
    auth_api(UserRights.admin),
    ValidatorsGroup.updateGroup,
    awaitHandlerFactory(usergroupController.update_id.bind(usergroupController))
);

export = router;
