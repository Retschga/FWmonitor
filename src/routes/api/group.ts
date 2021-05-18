'use strict';

import express from 'express';
import groupController from '../../controllers/group';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import * as ValidatorsGroup from '../../middleware/groupValidator';

const router = express.Router();

router.get('/', awaitHandlerFactory(groupController.get_list_all.bind(groupController)));
router.post(
    '/:id',
    ValidatorsGroup.updateGroup,
    awaitHandlerFactory(groupController.update_id.bind(groupController))
);

export = router;
