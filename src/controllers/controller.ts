'use strict';

import { Request } from 'express';
import { validationResult } from 'express-validator';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';

/**
 * Prüft die Parameter mit express validator
 */
export const checkValidation = (req: Request) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new HttpException(
            HttpStatusCodes.BAD_REQUEST,
            'Validation faild ' + errors.array()[0].msg,
            errors
        );
    }
};
