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

export const updateAlarmTelegram = [
    body('value')
        .exists()
        .withMessage('value is required')
        .isBoolean()
        .withMessage('limit must be boolean')
];

export const updateAlarmApp = [
    body('value')
        .exists()
        .withMessage('value is required')
        .isBoolean()
        .withMessage('value must be boolean')
];

export const updateUserstatus = [
    body('alarmid')
        .exists()
        .withMessage('alarmid is required')
        .isNumeric()
        .withMessage('alarmid must be numeric'),
    body('value')
        .exists()
        .withMessage('value is required')
        .isBoolean()
        .withMessage('value must be boolean')
];
