'use strict';

import { Request, Response, NextFunction } from 'express';
import logging from '../utils/logging';

const NAMESPACE = 'Sample_Controller';

const sampleHealthCheck = (req: Request, res: Response, next: NextFunction) => {
    logging.info(NAMESPACE, 'Sample health check route called');

    return res.status(200).json({ message: 'pong' });
};

export default { sampleHealthCheck };
