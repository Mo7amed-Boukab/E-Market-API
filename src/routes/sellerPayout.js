const express = require('express');
const router = express.Router();
const sellerPayoutController = require('../controllers/sellerPayoutController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const {
    calculatePayoutsValidator,
    createPayoutValidator,
    markAsPaidValidator,
    updateStatusValidator,
    payoutIdValidator,
    payoutListValidator,
} = require('../validators/sellerPayoutValidator');

/**
 * Routes de gestion des paiements aux sellers (Admin uniquement)
 * 
 * Ces routes permettent à l'admin de gérer les paiements aux sellers
 * qui n'utilisent PAS Stripe Connect (méthode simple).
 * 
 * FLUX:
 * 1. Admin calcule les montants dus pour une période
 * 2. Admin crée un payout pour chaque seller
 * 3. Admin effectue le virement bancaire
 * 4. Admin marque le payout comme payé
 */

// GET /api/v1/seller-payouts/calculate - Calculer les montants dus
router.get(
    '/calculate',
    authenticate,
    authorize('admin'),
    calculatePayoutsValidator,
    sellerPayoutController.calculatePendingPayouts
);

// POST /api/v1/seller-payouts - Créer un payout
router.post(
    '/',
    authenticate,
    authorize('admin'),
    createPayoutValidator,
    sellerPayoutController.createPayout
);

// GET /api/v1/seller-payouts - Liste des payouts
router.get(
    '/',
    authenticate,
    authorize('admin'),
    payoutListValidator,
    sellerPayoutController.getAllPayouts
);

// GET /api/v1/seller-payouts/stats - Statistiques
router.get(
    '/stats',
    authenticate,
    authorize('admin'),
    sellerPayoutController.getPayoutStats
);

// GET /api/v1/seller-payouts/:id - Détails d'un payout
router.get(
    '/:id',
    authenticate,
    authorize('admin'),
    payoutIdValidator,
    sellerPayoutController.getPayoutById
);

// PATCH /api/v1/seller-payouts/:id/mark-paid - Marquer comme payé
router.patch(
    '/:id/mark-paid',
    authenticate,
    authorize('admin'),
    markAsPaidValidator,
    sellerPayoutController.markAsPaid
);

// PATCH /api/v1/seller-payouts/:id/status - Mettre à jour le statut
router.patch(
    '/:id/status',
    authenticate,
    authorize('admin'),
    updateStatusValidator,
    sellerPayoutController.updatePayoutStatus
);

// DELETE /api/v1/seller-payouts/:id - Supprimer un payout
router.delete(
    '/:id',
    authenticate,
    authorize('admin'),
    payoutIdValidator,
    sellerPayoutController.deletePayout
);

module.exports = router;
