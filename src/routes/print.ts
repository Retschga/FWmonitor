'use strict';

import express from 'express';
import { Request, Response, NextFunction } from 'express';

const router = express.Router();

router.get('/', (req: Request, res: Response, next: NextFunction) => {
    res.render('print');
});

export = router;
