'use strict';

import { body, query } from 'express-validator';

export const update = [
    body('name').exists().withMessage('name is required').escape().trim(),
    body('appBenutzer').exists().withMessage('appBenutzer is required').escape().trim(),
    body('appPassword').optional().exists().withMessage('appPassword is required').escape()
    //    body('funk_name').optional().exists().withMessage('funk_name is required').escape()
];

export const getStatusList = [
    query('limit')
        .exists()
        .withMessage('limit is required')
        .isInt()
        .withMessage('limit must be a int'),
    query('offset')
        .exists()
        .withMessage('offset is required')
        .isInt()
        .withMessage('offset must be a int')
];
