'use strict';

import { body } from 'express-validator';
import { UserStatus } from '../models/user';

export const updateUserStatus = [
    body('value')
        .exists()
        .withMessage('value is required')
        .isIn([UserStatus.NICHT_VERFUEGBAR, UserStatus.VERFUEGBAR]),
    body('until').exists().withMessage('until is required')
    //       .isDate()
    //       .withMessage('until must be a date')
];

export const updateUserStatusPlans = [
    body('value')
        .exists()
        .withMessage('value is required')
        .isJSON()
        .withMessage('value is no valid json')
];

export const updateUserStatusHidden = [
    body('value')
        .exists()
        .withMessage('value is required')
        .isBoolean()
        .withMessage('value is no valid bool')
];

export const updateUser = [
    body('group').exists().withMessage('group is required'),
    body('admin').exists().withMessage('admin is required'),
    body('kalender')
        .exists()
        .withMessage('kalender is required')
        .isNumeric()
        .withMessage('kalender is not numeric')
        .isIn([0, 1, 2])
        .withMessage('kalender is not 0 or 1 or 2'),
    body('telefonliste').exists().withMessage('telefonliste is required'),
    body('drucker').exists().withMessage('drucker is required'),
    body('softwareInfo').exists().withMessage('softwareInfo is required'),
    body('kalenderGroups').exists().withMessage('kalenderGroups is required'),
    body('statusHidden').exists().withMessage('statusHidden is required'),
    body('stAGT').exists().withMessage('stAGT is required'),
    body('stMA').exists().withMessage('stMA is required'),
    body('stGRF').exists().withMessage('stGRF is required'),
    body('stZUGF').exists().withMessage('stZUGF is required')
];

export const updateNotificationsApp = [
    body('value')
        .exists()
        .withMessage('value is required')
        .isNumeric() 
        .withMessage('value is must be numeric'),
    body('subscription')
        .exists()
        .withMessage('subscription is required')
        
];

export const updateNotificationsCalendar = [
    body('value')
        .exists()
        .withMessage('value is required')
        .isBoolean()
        .withMessage('value is no valid bool')
];
