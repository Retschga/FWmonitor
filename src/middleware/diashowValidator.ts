'use strict';

import { body } from 'express-validator';

export const enable_pic = [body('filename').exists().withMessage('filename is required')];
export const disable_pic = [body('filename').exists().withMessage('filename is required')];
export const delete_pic = [body('filename').exists().withMessage('filename is required')];
