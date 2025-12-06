const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const ApiError = require('../utils/ApiError');

/**
 * Service de paiement Stripe Connect (Version Professionnelle)
 * 
 * Avec Stripe Connect :
 * - Chaque seller a son propre compte Stripe
 * - L'argent va DIRECTEMENT au seller
 * - La plateforme prend une commission automatique
 */
class StripeConnectService {
    /**
     * Créer un compte Stripe Connect pour un seller
     */
    async createConnectedAccount(sellerData) {
        try {
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'MA',
                email: sellerData.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                business_type: 'individual',
                business_profile: {
                    name: sellerData.businessName || sellerData.fullname,
                    product_description: sellerData.description || 'E-commerce products',
                },
                metadata: {
                    userId: sellerData.userId,
                    platform: 'E-Market',
                },
            });

            return {
                accountId: account.id,
                email: account.email,
                created: new Date(account.created * 1000),
                detailsSubmitted: account.details_submitted,
                chargesEnabled: account.charges_enabled,
                payoutsEnabled: account.payouts_enabled,
            };
        } catch (error) {
            console.error('Stripe Connect Account Creation Error:', error);
            throw ApiError.badRequest(`Failed to create seller account: ${error.message}`);
        }
    }

    /**
     * Créer un lien d'onboarding
     */
    async createAccountLink(accountId, returnUrl, refreshUrl) {
        try {
            const accountLink = await stripe.accountLinks.create({
                account: accountId,
                refresh_url: refreshUrl,
                return_url: returnUrl,
                type: 'account_onboarding',
            });

            return {
                url: accountLink.url,
                expiresAt: new Date(accountLink.expires_at * 1000),
            };
        } catch (error) {
            console.error('Stripe Account Link Error:', error);
            throw ApiError.badRequest(`Failed to create onboarding link: ${error.message}`);
        }
    }

    /**
     * Récupérer les informations d'un compte
     */
    async getConnectedAccount(accountId) {
        try {
            const account = await stripe.accounts.retrieve(accountId);

            return {
                id: account.id,
                email: account.email,
                detailsSubmitted: account.details_submitted,
                chargesEnabled: account.charges_enabled,
                payoutsEnabled: account.payouts_enabled,
                country: account.country,
                defaultCurrency: account.default_currency,
                created: new Date(account.created * 1000),
            };
        } catch (error) {
            console.error('Stripe Account Retrieve Error:', error);
            throw ApiError.notFound(`Seller account not found: ${error.message}`);
        }
    }

    /**
     * Créer une Payment Intent avec destination (UN SEUL SELLER)
     */
    async createPaymentIntentWithDestination(
        amount,
        sellerAccountId,
        platformFeePercent = 5,
        metadata = {}
    ) {
        try {
            const totalAmount = Math.round(amount * 100);
            const platformFee = Math.round((totalAmount * platformFeePercent) / 100);

            const paymentIntent = await stripe.paymentIntents.create({
                amount: totalAmount,
                currency: 'mad',
                metadata,
                automatic_payment_methods: {
                    enabled: true,
                },
                transfer_data: {
                    destination: sellerAccountId,
                },
                application_fee_amount: platformFee,
            });

            return {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency,
                status: paymentIntent.status,
                platformFee: platformFee / 100,
                sellerAmount: (totalAmount - platformFee) / 100,
            };
        } catch (error) {
            console.error('Stripe Payment Intent Error:', error);
            throw ApiError.badRequest(`Payment creation failed: ${error.message}`);
        }
    }

    /**
     * Créer une Payment Intent pour MULTI-SELLERS
     */
    async createMultiSellerPayment(sellerAmounts, platformFeePercent = 5, metadata = {}) {
        try {
            const totalAmount = sellerAmounts.reduce((sum, s) => sum + s.amount, 0);
            const totalAmountCents = Math.round(totalAmount * 100);

            const paymentIntent = await stripe.paymentIntents.create({
                amount: totalAmountCents,
                currency: 'mad',
                metadata: {
                    ...metadata,
                    multiSeller: true,
                    sellerCount: sellerAmounts.length,
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            return {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                amount: totalAmount,
                currency: 'mad',
                status: paymentIntent.status,
                sellerAmounts,
            };
        } catch (error) {
            console.error('Multi-Seller Payment Error:', error);
            throw ApiError.badRequest(`Multi-seller payment failed: ${error.message}`);
        }
    }

    /**
     * Transférer l'argent aux sellers (après paiement réussi)
     */
    async transferToSellers(paymentIntentId, sellerAmounts, platformFeePercent = 5) {
        try {
            const transfers = [];

            for (const seller of sellerAmounts) {
                const amountCents = Math.round(seller.amount * 100);
                const platformFee = Math.round((amountCents * platformFeePercent) / 100);
                const sellerAmount = amountCents - platformFee;

                const transfer = await stripe.transfers.create({
                    amount: sellerAmount,
                    currency: 'mad',
                    destination: seller.accountId,
                    transfer_group: paymentIntentId,
                    metadata: {
                        sellerId: seller.sellerId,
                        orderId: seller.orderId,
                    },
                });

                transfers.push({
                    transferId: transfer.id,
                    sellerId: seller.sellerId,
                    amount: sellerAmount / 100,
                    platformFee: platformFee / 100,
                    created: new Date(transfer.created * 1000),
                });
            }

            return transfers;
        } catch (error) {
            console.error('Transfer to Sellers Error:', error);
            throw ApiError.badRequest(`Transfer failed: ${error.message}`);
        }
    }

    /**
     * Créer un remboursement
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
     * Obtenir le solde d'un seller
     */
    async getSellerBalance(accountId) {
        try {
            const balance = await stripe.balance.retrieve({
                stripeAccount: accountId,
            });

            return {
                available: balance.available.map(b => ({
                    amount: b.amount / 100,
                    currency: b.currency,
                })),
                pending: balance.pending.map(b => ({
                    amount: b.amount / 100,
                    currency: b.currency,
                })),
            };
        } catch (error) {
            console.error('Balance Retrieve Error:', error);
            throw ApiError.badRequest(`Failed to get balance: ${error.message}`);
        }
    }

    /**
     * Créer un lien de dashboard pour le seller
     */
    async createDashboardLink(accountId) {
        try {
            const link = await stripe.accounts.createLoginLink(accountId);

            return {
                url: link.url,
                created: new Date(link.created * 1000),
            };
        } catch (error) {
            console.error('Dashboard Link Error:', error);
            throw ApiError.badRequest(`Failed to create dashboard link: ${error.message}`);
        }
    }

    /**
     * Vérifier la signature d'un webhook
     */
    verifyWebhookSignature(payload, signature) {
        try {
            const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

            if (!webhookSecret) {
                throw new Error('STRIPE_WEBHOOK_SECRET not configured');
            }

            const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
            return event;
        } catch (error) {
            console.error('Webhook Signature Verification Error:', error);
            throw ApiError.badRequest(`Webhook verification failed: ${error.message}`);
        }
    }

    /**
     * Traiter un événement webhook
     */
    async handleWebhookEvent(event) {
        const paymentIntent = event.data.object;

        switch (event.type) {
            case 'payment_intent.succeeded':
                return {
                    type: 'payment_succeeded',
                    paymentIntentId: paymentIntent.id,
                    amount: paymentIntent.amount / 100,
                    metadata: paymentIntent.metadata,
                };

            case 'payment_intent.payment_failed':
                return {
                    type: 'payment_failed',
                    paymentIntentId: paymentIntent.id,
                    error: paymentIntent.last_payment_error?.message,
                };

            case 'account.updated':
                return {
                    type: 'account_updated',
                    accountId: event.data.object.id,
                    chargesEnabled: event.data.object.charges_enabled,
                    payoutsEnabled: event.data.object.payouts_enabled,
                };

            default:
                return {
                    type: 'unhandled_event',
                    eventType: event.type,
                };
        }
    }
}

module.exports = new StripeConnectService();
