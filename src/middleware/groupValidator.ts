'use strict';

import { body } from 'express-validator';

export const updateGroup = [
    body('name').exists().withMessage('name is required'),
    body('pattern').exists().withMessage('pattern is required')
];
