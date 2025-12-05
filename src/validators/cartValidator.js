const { body, param } = require('express-validator');
const validatorMiddleware = require('../middlewares/validationMiddleware');
const mongoose = require('mongoose');

/**
 * Validators pour le panier
 */

// Validator pour ajouter au panier
const addToCartValidator = [
    body('productId')
        .notEmpty()
        .withMessage('Product ID is required')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid product ID'),

    body('quantity')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Quantity must be between 1 and 100'),

    validatorMiddleware,
];

// Validator pour mettre à jour la quantité
const updateCartItemValidator = [
    param('productId')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid product ID'),

    body('quantity')
        .notEmpty()
        .withMessage('Quantity is required')
        .isInt({ min: 0, max: 100 })
        .withMessage('Quantity must be between 0 and 100'),

    validatorMiddleware,
];

// Validator pour supprimer du panier
const removeFromCartValidator = [
    param('productId')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid product ID'),

    validatorMiddleware,
];

module.exports = {
    addToCartValidator,
    updateCartItemValidator,
    removeFromCartValidator,
};
