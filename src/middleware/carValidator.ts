'use strict';

import { body } from 'express-validator';

export const update = [
    body('name').exists().withMessage('name is required'),
    body('appBenutzer').exists().withMessage('appBenutzer is required'),
    body('appPassword').optional().exists().withMessage('appPassword is required')
];
