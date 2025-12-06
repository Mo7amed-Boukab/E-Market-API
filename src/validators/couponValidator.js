const { body, param, query } = require('express-validator');
const validatorMiddleware = require('../middlewares/validationMiddleware');
const mongoose = require('mongoose');

/**
 * Validators pour les coupons
 */

// Validator pour créer un coupon
const createCouponValidator = [
    body('code')
        .trim()
        .notEmpty()
        .withMessage('Coupon code is required')
        .isLength({ min: 3, max: 20 })
        .withMessage('Code must be between 3 and 20 characters')
        .matches(/^[A-Z0-9-]+$/i)
        .withMessage('Code can only contain letters, numbers and hyphens'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Description cannot exceed 200 characters'),

    body('discountType')
        .notEmpty()
        .withMessage('Discount type is required')
        .isIn(['percentage', 'fixed', 'free_shipping'])
        .withMessage('Invalid discount type'),

    body('discountValue')
        .notEmpty()
        .withMessage('Discount value is required')
        .isFloat({ min: 0 })
        .withMessage('Discount value must be a positive number')
        .custom((value, { req }) => {
            if (req.body.discountType === 'percentage' && value > 100) {
                throw new Error('Percentage discount cannot exceed 100%');
            }
            return true;
        }),

    body('minOrderAmount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Minimum order amount must be a positive number'),

    body('maxDiscountAmount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Maximum discount amount must be a positive number'),

    body('startDate')
        .notEmpty()
        .withMessage('Start date is required')
        .isISO8601()
        .withMessage('Invalid start date format'),

    body('expiryDate')
        .notEmpty()
        .withMessage('Expiry date is required')
        .isISO8601()
        .withMessage('Invalid expiry date format')
        .custom((value, { req }) => {
            if (new Date(value) <= new Date(req.body.startDate)) {
                throw new Error('Expiry date must be after start date');
            }
            return true;
        }),

    body('usageLimit.total')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Total usage limit must be at least 1'),

    body('usageLimit.perUser')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Per user limit must be at least 1'),

    body('restrictions.products')
        .optional()
        .isArray()
        .withMessage('Products must be an array')
        .custom((products) => {
            return products.every(id => mongoose.Types.ObjectId.isValid(id));
        })
        .withMessage('Invalid product ID(s)'),

    body('restrictions.categories')
        .optional()
        .isArray()
        .withMessage('Categories must be an array')
        .custom((categories) => {
            return categories.every(id => mongoose.Types.ObjectId.isValid(id));
        })
        .withMessage('Invalid category ID(s)'),

    body('restrictions.users')
        .optional()
        .isArray()
        .withMessage('Users must be an array')
        .custom((users) => {
            return users.every(id => mongoose.Types.ObjectId.isValid(id));
        })
        .withMessage('Invalid user ID(s)'),

    validatorMiddleware,
];

// Validator pour mettre à jour un coupon
const updateCouponValidator = [
    param('id')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid coupon ID'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Description cannot exceed 200 characters'),

    body('discountValue')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Discount value must be a positive number'),

    body('minOrderAmount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Minimum order amount must be a positive number'),

    body('maxDiscountAmount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Maximum discount amount must be a positive number'),

    body('expiryDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid expiry date format'),

    body('status')
        .optional()
        .isIn(['active', 'inactive', 'expired'])
        .withMessage('Invalid status'),

    validatorMiddleware,
];

// Validator pour valider un coupon
const validateCouponValidator = [
    param('code')
        .trim()
        .notEmpty()
        .withMessage('Coupon code is required'),

    body('orderAmount')
        .notEmpty()
        .withMessage('Order amount is required')
        .isFloat({ min: 0 })
        .withMessage('Order amount must be a positive number'),

    body('items')
        .optional()
        .isArray()
        .withMessage('Items must be an array'),

    validatorMiddleware,
];

// Validator pour l'ID de coupon
const couponIdValidator = [
    param('id')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid coupon ID'),

    validatorMiddleware,
];

// Validator pour la liste des coupons
const couponListValidator = [
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
        .isIn(['active', 'inactive', 'expired'])
        .withMessage('Invalid status'),

    validatorMiddleware,
];

module.exports = {
    createCouponValidator,
    updateCouponValidator,
    validateCouponValidator,
    couponIdValidator,
    couponListValidator,
};
