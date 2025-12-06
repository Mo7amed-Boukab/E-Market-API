const { body, param, query } = require('express-validator');
const validatorMiddleware = require('../middlewares/validationMiddleware');
const mongoose = require('mongoose');

/**
 * Validators pour les avis (Reviews)
 */

// Validator pour créer un avis
const createReviewValidator = [
    body('productId')
        .notEmpty()
        .withMessage('Product ID is required')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid product ID'),

    body('rating')
        .notEmpty()
        .withMessage('Rating is required')
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be an integer between 1 and 5'),

    body('comment')
        .notEmpty()
        .withMessage('Comment is required')
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Comment must be between 10 and 1000 characters'),

    validatorMiddleware,
];

// Validator pour mettre à jour un avis
const updateReviewValidator = [
    param('id')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid review ID'),

    body('rating')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be an integer between 1 and 5'),

    body('comment')
        .optional()
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Comment must be between 10 and 1000 characters'),

    validatorMiddleware,
];

// Validator pour l'ID
const reviewIdValidator = [
    param('id')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid review ID'),

    validatorMiddleware,
];

// Validator pour récupérer les avis d'un produit
const getProductReviewsValidator = [
    param('productId')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid product ID'),

    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),

    query('sort')
        .optional()
        .isIn(['-createdAt', 'createdAt', '-rating', 'rating', '-helpfulVotes'])
        .withMessage('Invalid sort parameter'),

    validatorMiddleware,
];

module.exports = {
    createReviewValidator,
    updateReviewValidator,
    reviewIdValidator,
    getProductReviewsValidator,
};
