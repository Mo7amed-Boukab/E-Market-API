const { body } = require('express-validator');
const validatorMeddleware = require('../middlewares/validationMiddleware');

/**
 * Validator pour l'inscription
 */
const registerValidator = [
    body('fullname')
        .trim()
        .notEmpty()
        .withMessage('Full name is required')
        .isString()
        .withMessage('Full name must be a string')
        .isLength({ min: 3 })
        .withMessage('Full name must be at least 3 characters'),

    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),

    body('password')
        .trim()
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

    body('role')
        .optional()
        .isIn(['user', 'seller', 'admin'])
        .withMessage("Role must be either 'user', 'seller' or 'admin'"),

    validatorMeddleware,
];

/**
 * Validator pour la connexion
 */
const loginValidator = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),

    body('password')
        .trim()
        .notEmpty()
        .withMessage('Password is required'),

    validatorMeddleware,
];

/**
 * Validator pour le changement de mot de passe
 */
const changePasswordValidator = [
    body('currentPassword')
        .trim()
        .notEmpty()
        .withMessage('Current password is required'),

    body('newPassword')
        .trim()
        .notEmpty()
        .withMessage('New password is required')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),

    body('confirmPassword')
        .trim()
        .notEmpty()
        .withMessage('Password confirmation is required')
        .custom((value, { req }) => value === req.body.newPassword)
        .withMessage('Passwords do not match'),

    validatorMeddleware,
];

/**
 * Validator pour le refresh token
 */
const refreshTokenValidator = [
    body('refreshToken')
        .trim()
        .notEmpty()
        .withMessage('Refresh token is required'),

    validatorMeddleware,
];

module.exports = {
    registerValidator,
    loginValidator,
    changePasswordValidator,
    refreshTokenValidator,
};
