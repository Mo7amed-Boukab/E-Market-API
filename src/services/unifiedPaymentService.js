const paymentService = require('./paymentService');
const stripeConnectService = require('./stripeConnectService');
const ApiError = require('../utils/ApiError');

/**
 * Service de paiement unifié (Hybride)
 * 
 * Détecte automatiquement la meilleure méthode :
 * - Si seller a Stripe Connect → Paiement direct
 * - Sinon → Paiement simple (vers plateforme)
 */
class UnifiedPaymentService {
    /**
     * Créer une Payment Intent (détection automatique)
     * 
     * @param {Object} order - Commande
     * @param {String} userId - ID de l'utilisateur
     * @returns {Object} Payment Intent
     */
    async createPaymentIntent(order, userId) {
        try {
            // Vérifier si tous les sellers ont Stripe Connect
            const sellers = [...new Set(order.items.map(item => item.seller))];
            const sellersWithConnect = sellers.filter(s => s.stripeAccountId);

            // CAS 1 : TOUS les sellers ont Stripe Connect → Paiement professionnel
            if (sellersWithConnect.length === sellers.length) {
                console.log('Using Stripe Connect (Professional)');
                return await this.createConnectPayment(order, userId);
            }

            // CAS 2 : AUCUN seller n'a Stripe Connect → Paiement simple
            if (sellersWithConnect.length === 0) {
                console.log('Using Simple Payment (Platform account)');
                return await this.createSimplePayment(order, userId);
            }

            // CAS 3 : MIXTE (certains ont, d'autres non) → Erreur
            throw ApiError.badRequest(
                'Mixed payment methods not supported. All sellers must use the same payment method.'
            );
        } catch (error) {
            throw error;
        }
    }

    /**
     * Créer un paiement SIMPLE (vers plateforme)
     */
    async createSimplePayment(order, userId) {
        const paymentIntent = await paymentService.createPaymentIntent(
            order.pricing.total,
            'mad',
            {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                userId: userId,
                paymentMethod: 'simple',
            }
        );

        return {
            ...paymentIntent,
            paymentMethod: 'simple',
            note: 'Payment will go to platform account. Platform will transfer to sellers manually.',
        };
    }

    /**
     * Créer un paiement PROFESSIONNEL (Stripe Connect)
     */
    async createConnectPayment(order, userId) {
        const sellers = [...new Set(order.items.map(item => item.seller._id.toString()))];

        // UN SEUL SELLER
        if (sellers.length === 1) {
            const seller = order.items[0].seller;

            const paymentIntent = await stripeConnectService.createPaymentIntentWithDestination(
                order.pricing.total,
                seller.stripeAccountId,
                5,
                {
                    orderId: order._id.toString(),
                    orderNumber: order.orderNumber,
                    userId: userId,
                    sellerId: seller._id.toString(),
                    paymentMethod: 'connect',
                }
            );

            return {
                ...paymentIntent,
                paymentMethod: 'connect',
                note: 'Payment will go directly to seller. Platform takes 5% commission automatically.',
            };
        }

        // MULTI-SELLERS
        const sellerAmounts = [];

        for (const item of order.items) {
            const sellerId = item.seller._id.toString();
            const amount = item.price * item.quantity;

            const existing = sellerAmounts.find(s => s.sellerId === sellerId);
            if (existing) {
                existing.amount += amount;
            } else {
                sellerAmounts.push({
                    sellerId,
                    accountId: item.seller.stripeAccountId,
                    amount,
                    orderId: order._id.toString(),
                });
            }
        }

        const paymentIntent = await stripeConnectService.createMultiSellerPayment(
            sellerAmounts,
            5,
            {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
                userId: userId,
                paymentMethod: 'connect',
            }
        );

        // Sauvegarder pour le webhook
        order.paymentInfo = {
            ...order.paymentInfo,
            multiSeller: true,
            sellerAmounts,
        };

        return {
            ...paymentIntent,
            paymentMethod: 'connect',
            note: 'Payment will be split automatically between sellers. Platform takes 5% commission.',
        };
    }

    /**
     * Traiter un webhook (détection automatique)
     */
    async handleWebhook(event, order) {
        const result = await paymentService.handleWebhookEvent(event);

        if (result.type === 'payment_succeeded') {
            // Si multi-sellers avec Connect, faire les transfers
            if (order.paymentInfo.multiSeller && order.paymentInfo.sellerAmounts) {
                await stripeConnectService.transferToSellers(
                    result.paymentIntentId,
                    order.paymentInfo.sellerAmounts,
                    5
                );
            }

            order.paymentStatus = 'paid';
            order.paymentInfo.paidAt = new Date();
            order.paymentInfo.transactionId = result.paymentIntentId;

            if (order.status === 'pending') {
                order.status = 'confirmed';
            }

            await order.save();
        } else if (result.type === 'payment_failed') {
            order.paymentStatus = 'failed';
            await order.save();
        }

        return result;
    }

    /**
     * Créer un remboursement (fonctionne pour les deux méthodes)
     */
    async createRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
        // Le remboursement fonctionne de la même manière pour les deux
        return await paymentService.createRefund(paymentIntentId, amount, reason);
    }

    /**
     * Obtenir les informations de paiement disponibles pour un seller
     */
    async getSellerPaymentInfo(seller) {
        const info = {
            sellerId: seller._id,
            hasStripeConnect: !!seller.stripeAccountId,
            paymentMethod: seller.stripeAccountId ? 'connect' : 'simple',
        };

        if (seller.stripeAccountId) {
            try {
                const account = await stripeConnectService.getConnectedAccount(seller.stripeAccountId);
                info.stripeAccount = {
                    chargesEnabled: account.chargesEnabled,
                    payoutsEnabled: account.payoutsEnabled,
                    detailsSubmitted: account.detailsSubmitted,
                };
            } catch (error) {
                info.stripeAccount = { error: 'Unable to fetch account info' };
            }
        }

        return info;
    }
}

module.exports = new UnifiedPaymentService();
