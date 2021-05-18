'use strict';

import { body } from 'express-validator';

export const update = [
    body('start')
        .exists()
        .withMessage('start is required')
        .isDate()
        .withMessage('start must be a Date'),
    body('remind')
        .exists()
        .withMessage('remind is required')
        .isDate()
        .withMessage('remind must be a Date'),
    body('group').exists().withMessage('group is required')
];
