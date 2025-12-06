const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const {
    createOrderValidator,
    updateOrderStatusValidator,
    cancelOrderValidator,
    orderIdValidator,
    orderListValidator,
} = require('../validators/orderValidator');

/**
 * Routes des commandes
 * 
 * PERMISSIONS:
 * - User : Créer commande, voir ses commandes, annuler
 * - Seller : Voir ses commandes, mettre à jour statut (UNIQUEMENT ses produits)
 * - Admin : Voir toutes les commandes (monitoring), annuler en cas de litige uniquement
 * 
 * RÈGLE IMPORTANTE:
 * Les sellers gèrent leurs commandes de manière indépendante.
 * L'admin ne peut PAS modifier le statut des commandes (respect de la propriété).
 */

// POST /api/v1/orders - Créer une commande (User/Seller)
router.post(
    '/',
    authenticate,
    authorize('user', 'seller'),
    createOrderValidator,
    orderController.createOrder
);

// GET /api/v1/orders/my - Mes commandes (User/Seller)
router.get(
    '/my',
    authenticate,
    authorize('user', 'seller'),
    orderListValidator,
    orderController.getMyOrders
);

// GET /api/v1/orders/seller - Commandes du seller (Seller)
router.get(
    '/seller',
    authenticate,
    authorize('seller'),
    orderListValidator,
    orderController.getSellerOrders
);

// GET /api/v1/orders/stats - Statistiques (Seller/Admin)
router.get(
    '/stats',
    authenticate,
    authorize('seller', 'admin'),
    orderController.getOrderStats
);

// GET /api/v1/orders - Toutes les commandes (Admin - monitoring uniquement)
router.get(
    '/',
    authenticate,
    authorize('admin'),
    orderListValidator,
    orderController.getAllOrders
);

// GET /api/v1/orders/:id - Détails d'une commande (User owner, Seller, Admin)
router.get(
    '/:id',
    authenticate,
    orderIdValidator,
    orderController.getOrderById
);

// PATCH /api/v1/orders/:id/status - Mettre à jour le statut (Seller UNIQUEMENT)
// L'admin ne peut PAS modifier le statut (respect de la propriété du seller)
router.patch(
    '/:id/status',
    authenticate,
    authorize('seller'),
    updateOrderStatusValidator,
    orderController.updateOrderStatus
);

// POST /api/v1/orders/:id/cancel - Annuler une commande
// - User : Peut annuler sa propre commande
// - Seller : Peut annuler les commandes de ses produits
// - Admin : Peut annuler UNIQUEMENT en cas de litige (raison obligatoire min 20 chars)
router.post(
    '/:id/cancel',
    authenticate,
    cancelOrderValidator,
    orderController.cancelOrder
);

module.exports = router;
