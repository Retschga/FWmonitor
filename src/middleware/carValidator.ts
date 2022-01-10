'use strict';

import { body } from 'express-validator';

export const update = [
    body('name').exists().withMessage('name is required').escape().trim(),
    body('appBenutzer').exists().withMessage('appBenutzer is required').escape().trim(),
    body('appPassword').optional().exists().withMessage('appPassword is required').escape()
];
