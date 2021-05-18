'use strict';

import { body, query } from 'express-validator';

export const getList = [
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
