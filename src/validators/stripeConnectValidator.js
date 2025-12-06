const { body, param } = require('express-validator');
const validatorMiddleware = require('../middlewares/validationMiddleware');
const mongoose = require('mongoose');

/**
 * Validators pour Stripe Connect
 */

// Validator pour créer un compte Stripe Connect
const createConnectAccountValidator = [
    body('businessName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Business name must be between 2 and 100 characters'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),

    validatorMiddleware,
];

// Validator pour créer un Payment Intent
const createConnectPaymentIntentValidator = [
    body('orderId')
        .notEmpty()
        .withMessage('Order ID is required')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid order ID'),

    validatorMiddleware,
];

// Validator pour créer un remboursement
const createConnectRefundValidator = [
    param('orderId')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid order ID'),

    body('amount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Amount must be a positive number'),

    body('reason')
        .optional()
        .trim()
        .isLength({ min: 10, max: 500 })
        .withMessage('Reason must be between 10 and 500 characters'),

    validatorMiddleware,
];

module.exports = {
    createConnectAccountValidator,
    createConnectPaymentIntentValidator,
    createConnectRefundValidator,
};
