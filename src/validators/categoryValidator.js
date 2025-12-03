const { body } = require('express-validator');
const validatorMeddleware = require('../middlewares/validationMiddleware');

const createCategoryValidator = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isString()
        .withMessage('Name must be a string')
        .isLength({ min: 3 })
        .withMessage('Name must be at least 3 characters'),

    validatorMeddleware,
];

const updateCategoryValidator = [
    body('name')
        .optional()
        .trim()
        .isString()
        .withMessage('Name must be a string')
        .isLength({ min: 3 })
        .withMessage('Name must be at least 3 characters'),

    validatorMeddleware,
];

module.exports = { createCategoryValidator, updateCategoryValidator };
