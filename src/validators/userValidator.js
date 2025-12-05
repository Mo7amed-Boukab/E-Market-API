const { body, param } = require('express-validator');
const validatorMiddleware = require('../middlewares/validationMiddleware');
const mongoose = require('mongoose');

/**
 * Validators pour les utilisateurs
 */

// Validator pour créer un utilisateur
const createUserValidator = [
    body('fullname')
        .trim()
        .notEmpty()
        .withMessage('Full name is required')
        .isLength({ min: 3, max: 100 })
        .withMessage('Full name must be between 3 and 100 characters'),

    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),

    validatorMiddleware,
];

// Validator pour l'ID utilisateur
const userIdValidator = [
    param('id')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid user ID'),

    validatorMiddleware,
];

module.exports = {
    createUserValidator,
    userIdValidator,
};
