const { body, param } = require('express-validator');
const validatorMiddleware = require('../middlewares/validationMiddleware');
const mongoose = require('mongoose');

/**
 * Validators pour les paiements
 */

// Validator pour créer un Payment Intent
const createPaymentIntentValidator = [
    body('orderId')
        .notEmpty()
        .withMessage('Order ID is required')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid order ID'),

    validatorMiddleware,
];

// Validator pour créer un remboursement
const createRefundValidator = [
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

// Validator pour l'ID de commande
const orderIdValidator = [
    param('orderId')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid order ID'),

    validatorMiddleware,
];

module.exports = {
    createPaymentIntentValidator,
    createRefundValidator,
    orderIdValidator,
};
