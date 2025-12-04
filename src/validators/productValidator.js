const { body, param } = require('express-validator');
const validatorMiddleware = require('../middlewares/validationMiddleware');
const mongoose = require('mongoose');

/**
 * Validators pour les produits
 */

// Validator pour créer un produit
const createProductValidator = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Title is required')
        .isLength({ min: 3, max: 200 })
        .withMessage('Title must be between 3 and 200 characters'),

    body('description')
        .trim()
        .notEmpty()
        .withMessage('Description is required')
        .isLength({ min: 10, max: 5000 })
        .withMessage('Description must be between 10 and 5000 characters'),

    body('price')
        .notEmpty()
        .withMessage('Price is required')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),

    body('originalPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Original price must be a positive number')
        .custom((value, { req }) => {
            if (value && req.body.price && parseFloat(value) < parseFloat(req.body.price)) {
                throw new Error('Original price must be greater than or equal to current price');
            }
            return true;
        }),

    body('stock')
        .notEmpty()
        .withMessage('Stock is required')
        .isInt({ min: 0 })
        .withMessage('Stock must be a positive integer'),

    body('categories')
        .isArray({ min: 1 })
        .withMessage('At least one category is required')
        .custom((categories) => {
            // Vérifier que tous les IDs sont valides
            return categories.every(id => mongoose.Types.ObjectId.isValid(id));
        })
        .withMessage('Invalid category ID(s)'),

    body('status')
        .optional()
        .isIn(['draft', 'published'])
        .withMessage("Status must be either 'draft' or 'published'"),

    body('visibility')
        .optional()
        .isIn(['public', 'private'])
        .withMessage("Visibility must be either 'public' or 'private'"),

    // SEO (optionnel)
    body('seo.metaTitle')
        .optional()
        .trim()
        .isLength({ max: 60 })
        .withMessage('Meta title cannot exceed 60 characters'),

    body('seo.metaDescription')
        .optional()
        .trim()
        .isLength({ max: 160 })
        .withMessage('Meta description cannot exceed 160 characters'),

    body('seo.keywords')
        .optional()
        .isArray()
        .withMessage('Keywords must be an array'),

    validatorMiddleware,
];

// Validator pour mettre à jour un produit
const updateProductValidator = [
    param('id')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid product ID'),

    body('title')
        .optional()
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Title must be between 3 and 200 characters'),

    body('description')
        .optional()
        .trim()
        .isLength({ min: 10, max: 5000 })
        .withMessage('Description must be between 10 and 5000 characters'),

    body('price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),

    body('originalPrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Original price must be a positive number')
        .custom((value, { req }) => {
            if (value && req.body.price && parseFloat(value) < parseFloat(req.body.price)) {
                throw new Error('Original price must be greater than or equal to current price');
            }
            return true;
        }),

    body('stock')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Stock must be a positive integer'),

    body('categories')
        .optional()
        .isArray({ min: 1 })
        .withMessage('At least one category is required')
        .custom((categories) => {
            return categories.every(id => mongoose.Types.ObjectId.isValid(id));
        })
        .withMessage('Invalid category ID(s)'),

    body('status')
        .optional()
        .isIn(['draft', 'published'])
        .withMessage("Status must be either 'draft' or 'published'"),

    body('visibility')
        .optional()
        .isIn(['public', 'private'])
        .withMessage("Visibility must be either 'public' or 'private'"),

    body('seo.metaTitle')
        .optional()
        .trim()
        .isLength({ max: 60 })
        .withMessage('Meta title cannot exceed 60 characters'),

    body('seo.metaDescription')
        .optional()
        .trim()
        .isLength({ max: 160 })
        .withMessage('Meta description cannot exceed 160 characters'),

    body('seo.keywords')
        .optional()
        .isArray()
        .withMessage('Keywords must be an array'),

    validatorMiddleware,
];

// Validator pour l'ID du produit
const productIdValidator = [
    param('id')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid product ID'),

    validatorMiddleware,
];

// Validator pour changer le status
const changeStatusValidator = [
    param('id')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid product ID'),

    body('status')
        .notEmpty()
        .withMessage('Status is required')
        .isIn(['draft', 'published'])
        .withMessage("Status must be either 'draft' or 'published'"),

    validatorMiddleware,
];

// Validator pour définir l'image principale
const setPrimaryImageValidator = [
    param('id')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid product ID'),

    body('imageIndex')
        .notEmpty()
        .withMessage('Image index is required')
        .isInt({ min: 0 })
        .withMessage('Image index must be a positive integer'),

    validatorMiddleware,
];

module.exports = {
    createProductValidator,
    updateProductValidator,
    productIdValidator,
    changeStatusValidator,
    setPrimaryImageValidator,
};
