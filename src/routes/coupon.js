const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const {
    createCouponValidator,
    updateCouponValidator,
    validateCouponValidator,
    couponIdValidator,
    couponListValidator,
} = require('../validators/couponValidator');

/**
 * Routes des coupons
 * 
 * PERMISSIONS:
 * - Seller : Créer (pour ses produits), voir les siens, modifier les siens, supprimer les siens
 * - Admin : Voir tous (monitoring uniquement), NE PEUT PAS créer/modifier/supprimer
 * - User : Valider un coupon (lors du checkout)
 * 
 * RÈGLE IMPORTANTE:
 * Seuls les sellers peuvent créer des coupons.
 * L'admin ne peut PAS créer de coupons.
 */

// GET /api/v1/coupons/generate - Générer un code aléatoire (Seller UNIQUEMENT)
router.get(
    '/generate',
    authenticate,
    authorize('seller'),
    couponController.generateCouponCode
);

// POST /api/v1/coupons - Créer un coupon (Seller UNIQUEMENT)
router.post(
    '/',
    authenticate,
    authorize('seller'),
    createCouponValidator,
    couponController.createCoupon
);

// GET /api/v1/coupons - Liste des coupons
// Seller : Ses coupons uniquement
// Admin : Tous les coupons (monitoring)
router.get(
    '/',
    authenticate,
    authorize('admin', 'seller'),
    couponListValidator,
    couponController.getAllCoupons
);

// POST /api/v1/coupons/validate/:code - Valider un coupon (User/Seller)
router.post(
    '/validate/:code',
    authenticate,
    authorize('user', 'seller'),
    validateCouponValidator,
    couponController.validateCoupon
);

// GET /api/v1/coupons/:id - Détails d'un coupon
// Seller : Ses coupons uniquement
// Admin : Tous les coupons (monitoring)
router.get(
    '/:id',
    authenticate,
    authorize('admin', 'seller'),
    couponIdValidator,
    couponController.getCouponById
);

// GET /api/v1/coupons/:id/stats - Statistiques d'un coupon
// Seller : Ses coupons uniquement
// Admin : Tous les coupons (monitoring)
router.get(
    '/:id/stats',
    authenticate,
    authorize('admin', 'seller'),
    couponIdValidator,
    couponController.getCouponStats
);

// PUT /api/v1/coupons/:id - Mettre à jour un coupon (Seller propriétaire UNIQUEMENT)
router.put(
    '/:id',
    authenticate,
    authorize('seller'),
    updateCouponValidator,
    couponController.updateCoupon
);

// DELETE /api/v1/coupons/:id - Supprimer un coupon (Seller propriétaire UNIQUEMENT)
router.delete(
    '/:id',
    authenticate,
    authorize('seller'),
    couponIdValidator,
    couponController.deleteCoupon
);

module.exports = router;
