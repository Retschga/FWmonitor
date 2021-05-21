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

export const ipdateAlarmTelegram = [
    body('value')
        .exists()
        .withMessage('value is required')
        .isBoolean()
        .withMessage('limit must be boolean')
];

export const ipdateAlarmApp = [
    body('value')
        .exists()
        .withMessage('value is required')
        .isBoolean()
        .withMessage('limit must be boolean')
];
