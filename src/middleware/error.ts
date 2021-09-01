import { Request, Response, NextFunction } from 'express';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';

import logging from '../utils/logging';

const NAMESPACE = 'Error_Middleware';

function errorMiddleware(
    error: HttpException,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Response<any, Record<string, any>> {
    // eslint-disable-next-line prefer-const
    let { status = 500, message, data } = error;
    logging.info(NAMESPACE, 'ErrorMiddleware called');
    logging.exception(NAMESPACE, error);

    if (error.status === HttpStatusCodes.INTERNAL_SERVER_ERROR || message == undefined) {
        logging.info(NAMESPACE, 'INTERNAL_SERVER_ERROR');
        message = 'Internal server error!';
    }

    error = {
        type: 'error',
        status,
        message,
        ...data
    };

    return res.status(status).send(error);
}

export default errorMiddleware;
