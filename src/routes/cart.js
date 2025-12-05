const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const {
    addToCartValidator,
    updateCartItemValidator,
    removeFromCartValidator,
} = require('../validators/cartValidator');

/**
 * Routes du panier
 * Toutes les routes nécessitent une authentification
 * Seuls les utilisateurs (user, seller) peuvent gérer leur panier
 */

// GET /api/v1/cart - Obtenir le panier
router.get(
    '/',
    authenticate,
    authorize('user', 'seller'),
    cartController.getCart
);

// GET /api/v1/cart/count - Obtenir le nombre d'articles (pour badge)
router.get(
    '/count',
    authenticate,
    authorize('user', 'seller'),
    cartController.getCartCount
);

// POST /api/v1/cart - Ajouter un produit au panier
router.post(
    '/',
    authenticate,
    authorize('user', 'seller'),
    addToCartValidator,
    cartController.addToCart
);

// PUT /api/v1/cart/:productId - Mettre à jour la quantité
router.put(
    '/:productId',
    authenticate,
    authorize('user', 'seller'),
    updateCartItemValidator,
    cartController.updateCartItem
);

// DELETE /api/v1/cart/:productId - Supprimer un produit
router.delete(
    '/:productId',
    authenticate,
    authorize('user', 'seller'),
    removeFromCartValidator,
    cartController.removeFromCart
);

// DELETE /api/v1/cart - Vider le panier
router.delete(
    '/',
    authenticate,
    authorize('user', 'seller'),
    cartController.clearCart
);

// POST /api/v1/cart/clean - Nettoyer les articles invalides
router.post(
    '/clean',
    authenticate,
    authorize('user', 'seller'),
    cartController.cleanCart
);

// POST /api/v1/cart/validate - Valider le panier avant commande
router.post(
    '/validate',
    authenticate,
    authorize('user', 'seller'),
    cartController.validateCart
);

module.exports = router;
