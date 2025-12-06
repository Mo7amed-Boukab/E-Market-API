const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { body } = require('express-validator');
const validatorMiddleware = require('../middlewares/validationMiddleware');
const mongoose = require('mongoose');

/**
 * Routes Wishlist (Favoris)
 */

// Validation simple
const toggleWishlistValidator = [
    body('productId')
        .notEmpty()
        .withMessage('Product ID is required')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid product ID'),
    validatorMiddleware
];

// POST /api/v1/wishlist/toggle - Ajouter/Retirer (User connecté)
router.post(
    '/toggle',
    authenticate,
    authorize('user'),
    toggleWishlistValidator,
    wishlistController.toggleWishlist
);

// GET /api/v1/wishlist - Ma Wishlist
router.get(
    '/',
    authenticate,
    authorize('user'),
    wishlistController.getMyWishlist
);

// GET /api/v1/wishlist/check - Vérifier les status (récupérer tous les IDs favoris)
router.get(
    '/check',
    authenticate,
    authorize('user'),
    wishlistController.checkWishlistStatus
);

module.exports = router;
