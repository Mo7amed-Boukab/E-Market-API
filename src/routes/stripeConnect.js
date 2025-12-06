const express = require('express');
const router = express.Router();
const stripeConnectController = require('../controllers/stripeConnectController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const {
    createConnectAccountValidator,
    createConnectPaymentIntentValidator,
    createConnectRefundValidator,
} = require('../validators/stripeConnectValidator');

/**
 * Routes Stripe Connect (Version de Paiement Professionnelle)
 * 
 * FLUX SELLER:
 * 1. Seller crée son compte Stripe Connect
 * 2. Seller complète son onboarding (KYC)
 * 3. Seller peut recevoir des paiements directement
 * 4. Plateforme prend une commission automatique (5%)
 * 
 * FLUX PAIEMENT:
 * 1. User paie
 * 2. Argent va DIRECTEMENT au seller
 * 3. Commission déduite automatiquement
 */

// POST /api/v1/stripe-connect/account - Créer un compte Stripe Connect (Seller)
router.post(
    '/account',
    authenticate,
    authorize('seller'),
    createConnectAccountValidator,
    stripeConnectController.createSellerAccount
);

// GET /api/v1/stripe-connect/onboarding - Obtenir le lien d'onboarding (Seller)
router.get(
    '/onboarding',
    authenticate,
    authorize('seller'),
    stripeConnectController.getOnboardingLink
);

// GET /api/v1/stripe-connect/account - Informations du compte (Seller)
router.get(
    '/account',
    authenticate,
    authorize('seller'),
    stripeConnectController.getAccountInfo
);

// GET /api/v1/stripe-connect/balance - Solde du seller (Seller)
router.get(
    '/balance',
    authenticate,
    authorize('seller'),
    stripeConnectController.getSellerBalance
);

// GET /api/v1/stripe-connect/dashboard - Lien du dashboard Stripe (Seller)
router.get(
    '/dashboard',
    authenticate,
    authorize('seller'),
    stripeConnectController.getDashboardLink
);

// POST /api/v1/stripe-connect/create-intent - Créer Payment Intent (User/Seller)
router.post(
    '/create-intent',
    authenticate,
    authorize('user', 'seller'),
    createConnectPaymentIntentValidator,
    stripeConnectController.createPaymentIntent
);

// POST /api/v1/stripe-connect/webhook - Webhook Stripe
router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    stripeConnectController.handleWebhook
);

// POST /api/v1/stripe-connect/refund/:orderId - Remboursement (Seller)
router.post(
    '/refund/:orderId',
    authenticate,
    authorize('seller'),
    createConnectRefundValidator,
    stripeConnectController.createRefund
);

module.exports = router;
