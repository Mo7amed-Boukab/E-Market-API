const { body, param } = require('express-validator');
const validatorMiddleware = require('../middlewares/validationMiddleware');
const mongoose = require('mongoose');

/**
 * Validators pour les catégories
 */

// Validator pour créer une catégorie
const createCategoryValidator = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 3, max: 50 })
        .withMessage('Name must be between 3 and 50 characters'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),

    validatorMiddleware,
];

// Validator pour mettre à jour une catégorie
const updateCategoryValidator = [
    param('id')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid category ID'),

    body('name')
        .optional()
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Name must be between 3 and 50 characters'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),

    validatorMiddleware,
];

// Validator pour l'ID de catégorie
const categoryIdValidator = [
    param('id')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid category ID'),

    validatorMiddleware,
];

module.exports = {
    createCategoryValidator,
    updateCategoryValidator,
    categoryIdValidator,
};
