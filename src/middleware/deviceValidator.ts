'use strict';

import { body, query } from 'express-validator';

export const send_action = [
    body('action')
        .exists()
        .withMessage('action is required')
        .isInt()
        .withMessage('action must be a int'),
    body('value').optional().exists().withMessage('offset is required').escape().trim()
];
