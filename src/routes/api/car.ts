'use strict';

import express from 'express';
import CarController from '../../controllers/car';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import * as ValidatorsCar from '../../middleware/carValidator';
import { auth_api, UserRights } from '../../middleware/auth';

const router = express.Router();

// Liste aller angelegten Autos
router.get(
    '/',
    auth_api(UserRights.admin),
    awaitHandlerFactory(CarController.get_list_all.bind(CarController))
);

// Auto anlegen
router.get(
    '/create',
    auth_api(UserRights.admin),
    awaitHandlerFactory(CarController.create.bind(CarController))
);

// Passwort für Auto generieren
router.get(
    '/password',
    auth_api(UserRights.admin),
    awaitHandlerFactory(CarController.password.bind(CarController))
);

// Bestimmtes Auto
router.get(
    '/:id',
    auth_api(UserRights.admin),
    awaitHandlerFactory(CarController.get_id.bind(CarController))
);

// Auto speichern
router.post(
    '/:id',
    auth_api(UserRights.admin),
    ValidatorsCar.update,
    awaitHandlerFactory(CarController.update_id.bind(CarController))
);

// Auto löschen
router.get(
    '/delete/:id',
    auth_api(UserRights.admin),
    awaitHandlerFactory(CarController.delete.bind(CarController))
);

export = router;
