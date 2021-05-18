'use strict';

import express from 'express';
import sampleController from '../../controllers/sample';
import CarController from '../../controllers/car';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import * as ValidatorsCar from '../../middleware/carValidator';

const router = express.Router();

router.get('/', awaitHandlerFactory(CarController.get_list_all.bind(CarController)));
router.get('/create', awaitHandlerFactory(CarController.create.bind(CarController)));
router.get('/password', awaitHandlerFactory(CarController.password.bind(CarController)));

router.get('/:id', awaitHandlerFactory(CarController.get_id.bind(CarController)));
router.post(
    '/:id',
    ValidatorsCar.update,
    awaitHandlerFactory(CarController.update_id.bind(CarController))
);

router.get('/delete/:id', awaitHandlerFactory(CarController.delete.bind(CarController)));

export = router;
