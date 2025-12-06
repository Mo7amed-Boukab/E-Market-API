const { body, param, query } = require('express-validator');
const validatorMiddleware = require('../middlewares/validationMiddleware');
const mongoose = require('mongoose');

/**
 * Validators pour les commandes
 */

// Validator pour créer une commande
const createOrderValidator = [
    body('shippingAddress')
        .notEmpty()
        .withMessage('Shipping address is required'),

    body('shippingAddress.fullName')
        .trim()
        .notEmpty()
        .withMessage('Full name is required')
        .isLength({ min: 3, max: 100 })
        .withMessage('Full name must be between 3 and 100 characters'),

    body('shippingAddress.phone')
        .trim()
        .notEmpty()
        .withMessage('Phone is required')
        .matches(/^(\+212|0)[5-7]\d{8}$/)
        .withMessage('Invalid Moroccan phone number'),

    body('shippingAddress.address')
        .trim()
        .notEmpty()
        .withMessage('Address is required')
        .isLength({ min: 10, max: 200 })
        .withMessage('Address must be between 10 and 200 characters'),

    body('shippingAddress.city')
        .trim()
        .notEmpty()
        .withMessage('City is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('City must be between 2 and 50 characters'),

    body('shippingAddress.postalCode')
        .trim()
        .notEmpty()
        .withMessage('Postal code is required')
        .matches(/^\d{5}$/)
        .withMessage('Invalid postal code format (5 digits)'),

    body('shippingAddress.country')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Country must be between 2 and 50 characters'),

    body('paymentMethod')
        .optional()
        .isIn(['cash_on_delivery', 'card', 'paypal'])
        .withMessage('Invalid payment method'),

    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters'),

    validatorMiddleware,
];

// Validator pour mettre à jour le statut
const updateOrderStatusValidator = [
    param('id')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid order ID'),

    body('status')
        .notEmpty()
        .withMessage('Status is required')
        .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
        .withMessage('Invalid status'),

    body('comment')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Comment cannot exceed 500 characters'),

    validatorMiddleware,
];

// Validator pour annuler une commande
const cancelOrderValidator = [
    param('id')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid order ID'),

    body('reason')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Reason cannot exceed 500 characters'),

    validatorMiddleware,
];

// Validator pour l'ID de commande
const orderIdValidator = [
    param('id')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid order ID'),

    validatorMiddleware,
];

// Validator pour les query params de liste
const orderListValidator = [
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
        .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
        .withMessage('Invalid status'),

    validatorMiddleware,
];

module.exports = {
    createOrderValidator,
    updateOrderStatusValidator,
    cancelOrderValidator,
    orderIdValidator,
    orderListValidator,
};
