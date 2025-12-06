const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const {
    createPaymentIntentValidator,
    createRefundValidator,
    orderIdValidator,
} = require('../validators/paymentValidator');

/**
 * Routes de paiement Stripe
 * 
 * FLUX:
 * 1. User crée une commande
 * 2. User demande un Payment Intent
 * 3. Frontend utilise Stripe.js pour collecter les infos de carte
 * 4. Stripe traite le paiement
 * 5. Webhook notifie notre API
 * 6. Commande mise à jour automatiquement
 */

// GET /api/v1/payments/config - Configuration publique Stripe
router.get(
    '/config',
    paymentController.getPublicConfig
);

// POST /api/v1/payments/create-intent - Créer une Payment Intent
router.post(
    '/create-intent',
    authenticate,
    authorize('user', 'seller'),
    createPaymentIntentValidator,
    paymentController.createPaymentIntent
);

// POST /api/v1/payments/webhook - Webhook Stripe (pas d'auth, vérifié par signature)
router.post(
    '/webhook',
    express.raw({ type: 'application/json' }), // Important: raw body pour vérifier la signature
    paymentController.handleWebhook
);

// GET /api/v1/payments/status/:orderId - Vérifier le statut d'un paiement
router.get(
    '/status/:orderId',
    authenticate,
    orderIdValidator,
    paymentController.checkPaymentStatus
);

// POST /api/v1/payments/refund/:orderId - Créer un remboursement (Seller UNIQUEMENT)
router.post(
    '/refund/:orderId',
    authenticate,
    authorize('seller'),
    createRefundValidator,
    paymentController.createRefund
);

module.exports = router;
