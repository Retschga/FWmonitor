'use strict';

import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';
import { Request } from 'express';
import { validationResult } from 'express-validator';

/**
 * Prüft die Parameter mit express validator
 */
export function checkValidation(req: Request): void {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new HttpException(
            HttpStatusCodes.BAD_REQUEST,
            'Validation faild ' + errors.array()[0].msg,
            errors
        );
    }
}
