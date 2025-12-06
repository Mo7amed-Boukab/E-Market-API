const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const ApiError = require('../utils/ApiError');

/**
 * Service de paiement Stripe 
 * 
 * Cette version utilise des paiements directs :
 * - L'argent va sur votre compte Stripe
 * - Vous reversez manuellement aux sellers
 */
class PaymentService {
    /**
     * Créer une Payment Intent (intention de paiement)
     * 
     * @param {Number} amount - Montant en centimes (ex: 1000 = 10.00 DH)
     * @param {String} currency - Devise (ex: 'mad' pour Dirham Marocain)
     * @param {Object} metadata - Métadonnées (orderId, userId, etc.)
     * @returns {Object} Payment Intent avec client_secret
     */
    async createPaymentIntent(amount, currency = 'mad', metadata = {}) {
        try {
            // Créer une Payment Intent sur Stripe
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // Convertir en centimes
                currency: currency.toLowerCase(),
                metadata, // Informations supplémentaires
                automatic_payment_methods: {
                    enabled: true, // Active tous les moyens de paiement disponibles
                },
            });

            return {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                status: paymentIntent.status,
            };
        } catch (error) {
            console.error('Stripe Payment Intent Error:', error);
            throw ApiError.badRequest(`Payment creation failed: ${error.message}`);
        }
    }

    /**
     * Récupérer une Payment Intent
     * 
     * @param {String} paymentIntentId - ID de la Payment Intent
     * @returns {Object} Payment Intent
     */
    async getPaymentIntent(paymentIntentId) {
        try {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

            return {
                id: paymentIntent.id,
                amount: paymentIntent.amount / 100, // Convertir en unités normales
                currency: paymentIntent.currency,
                status: paymentIntent.status,
                metadata: paymentIntent.metadata,
                created: new Date(paymentIntent.created * 1000),
            };
        } catch (error) {
            console.error('Stripe Retrieve Error:', error);
            throw ApiError.notFound(`Payment not found: ${error.message}`);
        }
    }

    /**
     * Confirmer un paiement manuellement (si nécessaire)
     * 
     * @param {String} paymentIntentId - ID de la Payment Intent
     * @returns {Object} Payment Intent confirmé
     */
    async confirmPayment(paymentIntentId) {
        try {
            const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);

            return {
                id: paymentIntent.id,
                status: paymentIntent.status,
                amount: paymentIntent.amount / 100,
            };
        } catch (error) {
            console.error('Stripe Confirm Error:', error);
            throw ApiError.badRequest(`Payment confirmation failed: ${error.message}`);
        }
    }

    /**
     * Annuler un paiement (avant confirmation)
     * 
     * @param {String} paymentIntentId - ID de la Payment Intent
     * @returns {Object} Payment Intent annulé
     */
    async cancelPayment(paymentIntentId) {
        try {
            const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);

            return {
                id: paymentIntent.id,
                status: paymentIntent.status,
                canceledAt: new Date(),
            };
        } catch (error) {
            console.error('Stripe Cancel Error:', error);
            throw ApiError.badRequest(`Payment cancellation failed: ${error.message}`);
        }
    }

    /**
     * Créer un remboursement
     * 
     * @param {String} paymentIntentId - ID de la Payment Intent
     * @param {Number} amount - Montant à rembourser (optionnel, par défaut = montant total)
     * @param {String} reason - Raison du remboursement
     * @returns {Object} Refund
     */
    async createRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
        try {
            const refundData = {
                payment_intent: paymentIntentId,
                reason,
            };

            if (amount) {
                refundData.amount = Math.round(amount * 100);
            }

            const refund = await stripe.refunds.create(refundData);

            return {
                id: refund.id,
                amount: refund.amount / 100,
                status: refund.status,
                reason: refund.reason,
                created: new Date(refund.created * 1000),
            };
        } catch (error) {
            console.error('Stripe Refund Error:', error);
            throw ApiError.badRequest(`Refund failed: ${error.message}`);
        }
    }

    /**
     * Vérifier la signature d'un webhook Stripe
     * 
     * @param {String} payload - Corps de la requête
     * @param {String} signature - Signature Stripe
     * @returns {Object} Event Stripe
     */
    verifyWebhookSignature(payload, signature) {
        try {
            const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

            if (!webhookSecret) {
                throw new Error('STRIPE_WEBHOOK_SECRET not configured');
            }

            const event = stripe.webhooks.constructEvent(
                payload,
                signature,
                webhookSecret
            );

            return event;
        } catch (error) {
            console.error('Webhook Signature Verification Error:', error);
            throw ApiError.badRequest(`Webhook verification failed: ${error.message}`);
        }
    }

    /**
     * Traiter un événement webhook
     * 
     * @param {Object} event - Événement Stripe
     * @returns {Object} Résultat du traitement
     */
    async handleWebhookEvent(event) {
        const paymentIntent = event.data.object;

        switch (event.type) {
            case 'payment_intent.succeeded':
                // Paiement réussi
                return {
                    type: 'payment_succeeded',
                    paymentIntentId: paymentIntent.id,
                    amount: paymentIntent.amount / 100,
                    metadata: paymentIntent.metadata,
                };

            case 'payment_intent.payment_failed':
                // Paiement échoué
                return {
                    type: 'payment_failed',
                    paymentIntentId: paymentIntent.id,
                    error: paymentIntent.last_payment_error?.message,
                };

            case 'payment_intent.canceled':
                // Paiement annulé
                return {
                    type: 'payment_canceled',
                    paymentIntentId: paymentIntent.id,
                };

            default:
                return {
                    type: 'unhandled_event',
                    eventType: event.type,
                };
        }
    }

    /**
     * Calculer les frais de plateforme (commission)
     * 
     * @param {Number} amount - Montant total
     * @param {Number} commissionRate - Taux de commission (ex: 0.10 pour 10%)
     * @returns {Object} Détails des frais
     */
    calculatePlatformFees(amount, commissionRate = 0.05) {
        const platformFee = amount * commissionRate;
        const sellerAmount = amount - platformFee;

        return {
            totalAmount: amount,
            platformFee: Math.round(platformFee * 100) / 100,
            sellerAmount: Math.round(sellerAmount * 100) / 100,
            commissionRate: commissionRate * 100 + '%',
        };
    }
}

module.exports = new PaymentService();
