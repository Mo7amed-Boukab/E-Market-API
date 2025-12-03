const { body } = require('express-validator');
const validatorMeddleware = require('../middlewares/validationMiddleware');

const createProductValidator = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Title is required')
        .isString()
        .withMessage('Title must be a string')
        .isLength({ min: 3 })
        .withMessage('Title must be at least 3 characters'),

    body('description')
        .trim()
        .notEmpty()
        .withMessage('Description is required')
        .isString()
        .withMessage('Description must be a string')
        .isLength({ min: 8 })
        .withMessage('Description must be at least 8 characters'),

    body('price')
        .notEmpty()
        .withMessage('Price is required')
        .isNumeric()
        .withMessage('Price must be a number')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),

    body('stock')
        .notEmpty()
        .withMessage('Stock is required')
        .isInt({ min: 0 })
        .withMessage('Stock must be a positive integer'),

    body('category')
        .trim()
        .notEmpty()
        .withMessage('Category is required')
        .isString()
        .withMessage('Category must be a string'),

    validatorMeddleware,
];

const updateProductValidator = [
    body('title')
        .optional()
        .trim()
        .isString()
        .withMessage('Title must be a string')
        .isLength({ min: 3 })
        .withMessage('Title must be at least 3 characters'),

    body('description')
        .optional()
        .trim()
        .isString()
        .withMessage('Description must be a string')
        .isLength({ min: 8 })
        .withMessage('Description must be at least 8 characters'),

    body('price')
        .optional()
        .isNumeric()
        .withMessage('Price must be a number')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),

    body('stock')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Stock must be a positive integer'),

    body('category')
        .optional()
        .trim()
        .isString()
        .withMessage('Category must be a string'),

    validatorMeddleware,
];

module.exports = { createProductValidator, updateProductValidator };
