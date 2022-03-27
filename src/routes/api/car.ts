'use strict';

import * as ValidatorsCar from '../../middleware/carValidator';

import { UserRights, auth_api } from '../../middleware/auth';

import CarController from '../../controllers/car';
import { awaitHandlerFactory } from '../../middleware/awaitHandlerFactory';
import express from 'express';

const router = express.Router();

// Liste aller angelegten Autos
router.get(
    '/',
    auth_api(UserRights.admin, UserRights.car_list),
    awaitHandlerFactory(CarController.get_list_all.bind(CarController))
);

// Liste aller Funkstati
router.get(
    '/funkstatus_list',
    auth_api(UserRights.admin, UserRights.car_list),
    ValidatorsCar.getStatusList,
    awaitHandlerFactory(CarController.get_funkstatus_list_all.bind(CarController))
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
    auth_api(UserRights.admin, UserRights.ownid),
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
router.post(
    '/delete/:id',
    auth_api(UserRights.admin),
    awaitHandlerFactory(CarController.delete.bind(CarController))
);

export = router;
