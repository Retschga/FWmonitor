'use strict';

import { body } from 'express-validator';

export const update = [
    body('summary').exists().withMessage('summary is required').trim().escape(),
    body('start')
        .exists()
        .withMessage('start is required')
        .isISO8601()
        .withMessage('start must be a Date')
        .isAfter()
        .withMessage('start must be after now'),
    body('remind')
        .exists()
        .withMessage('remind is required')
        .isISO8601()
        .withMessage('remind must be a Date')
        .isAfter()
        .withMessage('remind must be after now'),
    body('group').exists().withMessage('group is required').escape()
];
