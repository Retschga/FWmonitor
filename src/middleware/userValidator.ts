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
        .escape()
        .trim()
];

export const updateUserStatusHidden = [
    body('value')
        .exists()
        .withMessage('value is required')
        .isBoolean()
        .withMessage('value is no valid bool')
];

export const updateUser = [
    body('group')
        .exists()
        .withMessage('group is required')
        .isNumeric()
        .withMessage('admin must be numeric'),
    body('admin')
        .exists()
        .withMessage('admin is required')
        .isBoolean()
        .withMessage('admin must be boolean'),
    body('kalender')
        .exists()
        .withMessage('kalender is required')
        .isNumeric()
        .withMessage('kalender is not numeric')
        .isIn([0, 1, 2])
        .withMessage('kalender is not 0 or 1 or 2'),
    body('telefonliste')
        .exists()
        .withMessage('telefonliste is required')
        .isBoolean()
        .withMessage('telefonliste must be boolean'),
    body('drucker')
        .exists()
        .withMessage('drucker is required')
        .isBoolean()
        .withMessage('drucker must be boolean'),
    body('softwareInfo')
        .exists()
        .withMessage('softwareInfo is required')
        .isBoolean()
        .withMessage('softwareInfo must be boolean'),
    body('kalenderGroups').exists().withMessage('kalenderGroups is required').escape().trim(),
    body('statusHidden')
        .exists()
        .withMessage('statusHidden is required')
        .isBoolean()
        .withMessage('statusHidden must be boolean'),
    body('stAGT')
        .exists()
        .withMessage('stAGT is required')
        .isBoolean()
        .withMessage('stAGT must be boolean'),
    body('stMA')
        .exists()
        .withMessage('stMA is required')
        .isBoolean()
        .withMessage('stMA must be boolean'),
    body('stGRF')
        .exists()
        .withMessage('stGRF is required')
        .isBoolean()
        .withMessage('stGRF must be boolean'),
    body('stZUGF')
        .exists()
        .withMessage('stZUGF is required')
        .isBoolean()
        .withMessage('stZUGF must be boolean')
];

export const updateNotificationsApp = [
    body('value')
        .exists()
        .withMessage('value is required')
        .isNumeric()
        .withMessage('value is must be numeric'),
    body('subscription').exists().withMessage('subscription is required')
];

export const updateNotificationsCalendar = [
    body('value')
        .exists()
        .withMessage('value is required')
        .isBoolean()
        .withMessage('value is no valid bool')
];
