const { body, param, query } = require('express-validator');
const validatorMiddleware = require('../middlewares/validationMiddleware');
const mongoose = require('mongoose');

/**
 * Validators pour les payouts sellers
 */

// Validator pour calculer les payouts
const calculatePayoutsValidator = [
    query('startDate')
        .notEmpty()
        .withMessage('Start date is required')
        .isISO8601()
        .withMessage('Invalid start date format'),

    query('endDate')
        .notEmpty()
        .withMessage('End date is required')
        .isISO8601()
        .withMessage('Invalid end date format'),

    validatorMiddleware,
];

// Validator pour créer un payout
const createPayoutValidator = [
    body('sellerId')
        .notEmpty()
        .withMessage('Seller ID is required')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid seller ID'),

    body('startDate')
        .notEmpty()
        .withMessage('Start date is required')
        .isISO8601()
        .withMessage('Invalid start date format'),

    body('endDate')
        .notEmpty()
        .withMessage('End date is required')
        .isISO8601()
        .withMessage('Invalid end date format'),

    body('orders')
        .isArray({ min: 1 })
        .withMessage('Orders must be a non-empty array'),

    body('orders.*.orderId')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid order ID'),

    body('orders.*.amount')
        .isFloat({ min: 0 })
        .withMessage('Amount must be a positive number'),

    body('accountHolder')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Account holder must be between 2 and 100 characters'),

    body('iban')
        .optional()
        .trim()
        .isLength({ min: 15, max: 34 })
        .withMessage('Invalid IBAN format'),

    body('bankName')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Bank name cannot exceed 100 characters'),

    validatorMiddleware,
];

// Validator pour marquer comme payé
const markAsPaidValidator = [
    param('id')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid payout ID'),

    body('transactionId')
        .notEmpty()
        .withMessage('Transaction ID is required')
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Transaction ID must be between 3 and 100 characters'),

    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters'),

    validatorMiddleware,
];

// Validator pour mettre à jour le statut
const updateStatusValidator = [
    param('id')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid payout ID'),

    body('status')
        .notEmpty()
        .withMessage('Status is required')
        .isIn(['pending', 'processing', 'paid', 'failed'])
        .withMessage('Invalid status'),

    body('comment')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Comment cannot exceed 500 characters'),

    validatorMiddleware,
];

// Validator pour l'ID
const payoutIdValidator = [
    param('id')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid payout ID'),

    validatorMiddleware,
];

// Validator pour la liste
const payoutListValidator = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),

    query('status')
        .optional()
        .isIn(['pending', 'processing', 'paid', 'failed'])
        .withMessage('Invalid status'),

    query('sellerId')
        .optional()
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid seller ID'),

    validatorMiddleware,
];

module.exports = {
    calculatePayoutsValidator,
    createPayoutValidator,
    markAsPaidValidator,
    updateStatusValidator,
    payoutIdValidator,
    payoutListValidator,
};
