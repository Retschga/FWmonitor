import { Request, Response, NextFunction } from 'express';
import HttpException from '../utils/httpException';
import HttpStatusCodes from '../utils/httpStatusCodes';

import logging from '../utils/logging';

const NAMESPACE = 'Error_Middleware';

const errorMiddleware = (error: HttpException, req: Request, res: Response, next: NextFunction) => {
    let { status = 500, message, data } = error;

    logging.info(NAMESPACE, 'ErrorMiddleware called');
    logging.ecxeption(NAMESPACE, error);

    if (error.status === HttpStatusCodes.INTERNAL_SERVER_ERROR || error.message == undefined) {
        error.message = 'Internal server error';
    }

    error = {
        txpe: 'error',
        status,
        message,
        ...data
    };

    return res.status(status).send(error);
};

export default errorMiddleware;
