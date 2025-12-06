const stripeConnectService = require('../services/stripeConnectService');
const Order = require('../models/order');
const User = require('../models/user');
const ApiError = require('../utils/ApiError');

class StripeConnectController {
    /**
     * Créer un compte Stripe Connect pour un seller
     */
    async createSellerAccount(req, res, next) {
        try {
            const userId = req.user.userId;
            const userRole = req.user.role;

            if (userRole !== 'seller') {
                throw ApiError.forbidden('Only sellers can create a Stripe account');
            }

            const user = await User.findById(userId);
            if (user.stripeAccountId) {
                throw ApiError.badRequest('You already have a Stripe account');
            }

            const account = await stripeConnectService.createConnectedAccount({
                userId: userId,
                email: user.email,
                fullname: user.fullname,
                businessName: req.body.businessName,
                description: req.body.description,
            });

            user.stripeAccountId = account.accountId;
            await user.save();

            res.status(201).json({
                message: 'Stripe account created successfully',
                account,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtenir le lien d'onboarding
     */
    async getOnboardingLink(req, res, next) {
        try {
            const userId = req.user.userId;
            const user = await User.findById(userId);

            if (!user.stripeAccountId) {
                throw ApiError.badRequest('No Stripe account found. Create one first.');
            }

            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const returnUrl = `${baseUrl}/seller/dashboard?stripe=success`;
            const refreshUrl = `${baseUrl}/seller/dashboard?stripe=refresh`;

            const link = await stripeConnectService.createAccountLink(
                user.stripeAccountId,
                returnUrl,
                refreshUrl
            );

            res.status(200).json({
                message: 'Onboarding link created',
                url: link.url,
                expiresAt: link.expiresAt,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtenir les informations du compte
     */
    async getAccountInfo(req, res, next) {
        try {
            const userId = req.user.userId;
            const user = await User.findById(userId);

            if (!user.stripeAccountId) {
                throw ApiError.notFound('No Stripe account found');
            }

            const account = await stripeConnectService.getConnectedAccount(
                user.stripeAccountId
            );

            res.status(200).json({ account });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Créer une Payment Intent avec Stripe Connect
     */
    async createPaymentIntent(req, res, next) {
        try {
            const { orderId } = req.body;
            const userId = req.user.userId;

            const order = await Order.findOne({
                _id: orderId,
                user: userId,
                deleted: false,
            }).populate('items.seller', 'stripeAccountId');

            if (!order) {
                throw ApiError.notFound('Order not found');
            }

            if (order.paymentStatus === 'paid') {
                throw ApiError.badRequest('Order is already paid');
            }

            if (order.status === 'cancelled') {
                throw ApiError.badRequest('Cannot pay for a cancelled order');
            }

            const sellers = [...new Set(order.items.map(item => item.seller._id.toString()))];

            let paymentIntent;

            if (sellers.length === 1) {
                // UN SEUL SELLER
                const seller = order.items[0].seller;

                if (!seller.stripeAccountId) {
                    throw ApiError.badRequest('Seller has not set up their Stripe account yet');
                }

                paymentIntent = await stripeConnectService.createPaymentIntentWithDestination(
                    order.pricing.total,
                    seller.stripeAccountId,
                    5,
                    {
                        orderId: order._id.toString(),
                        orderNumber: order.orderNumber,
                        userId: userId,
                        sellerId: seller._id.toString(),
                    }
                );
            } else {
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

                const missingAccounts = sellerAmounts.filter(s => !s.accountId);
                if (missingAccounts.length > 0) {
                    throw ApiError.badRequest('Some sellers have not set up their Stripe account yet');
                }

                paymentIntent = await stripeConnectService.createMultiSellerPayment(
                    sellerAmounts,
                    5,
                    {
                        orderId: order._id.toString(),
                        orderNumber: order.orderNumber,
                        userId: userId,
                    }
                );

                order.paymentInfo = {
                    ...order.paymentInfo,
                    multiSeller: true,
                    sellerAmounts,
                };
            }

            order.paymentInfo = {
                ...order.paymentInfo,
                paymentIntentId: paymentIntent.paymentIntentId,
            };
            await order.save();

            res.status(200).json({
                message: 'Payment intent created successfully',
                clientSecret: paymentIntent.clientSecret,
                amount: order.pricing.total,
                currency: 'MAD',
                platformFee: paymentIntent.platformFee,
                sellerAmount: paymentIntent.sellerAmount,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Webhook Stripe Connect
     */
    async handleWebhook(req, res, next) {
        try {
            const signature = req.headers['stripe-signature'];
            const payload = req.body;

            const event = stripeConnectService.verifyWebhookSignature(payload, signature);
            const result = await stripeConnectService.handleWebhookEvent(event);

            if (result.type === 'payment_succeeded') {
                const order = await Order.findOne({
                    'paymentInfo.paymentIntentId': result.paymentIntentId,
                });

                if (order) {
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
                }
            } else if (result.type === 'payment_failed') {
                const order = await Order.findOne({
                    'paymentInfo.paymentIntentId': result.paymentIntentId,
                });

                if (order) {
                    order.paymentStatus = 'failed';
                    await order.save();
                }
            }

            res.status(200).json({ received: true });
        } catch (error) {
            console.error('Webhook Error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * Obtenir le solde du seller
     */
    async getSellerBalance(req, res, next) {
        try {
            const userId = req.user.userId;
            const user = await User.findById(userId);

            if (!user.stripeAccountId) {
                throw ApiError.notFound('No Stripe account found');
            }

            const balance = await stripeConnectService.getSellerBalance(user.stripeAccountId);

            res.status(200).json({ balance });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtenir le lien du dashboard Stripe
     */
    async getDashboardLink(req, res, next) {
        try {
            const userId = req.user.userId;
            const user = await User.findById(userId);

            if (!user.stripeAccountId) {
                throw ApiError.notFound('No Stripe account found');
            }

            const link = await stripeConnectService.createDashboardLink(user.stripeAccountId);

            res.status(200).json({
                message: 'Dashboard link created',
                url: link.url,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Créer un remboursement
     */
    async createRefund(req, res, next) {
        try {
            const { orderId } = req.params;
            const { amount, reason } = req.body;
            const userId = req.user.userId;

            const order = await Order.findOne({
                _id: orderId,
                deleted: false,
            });

            if (!order) {
                throw ApiError.notFound('Order not found');
            }

            const isSeller = order.items.some(item => item.seller.toString() === userId);

            if (!isSeller) {
                throw ApiError.forbidden('Only the seller can refund this order');
            }

            if (order.paymentStatus !== 'paid') {
                throw ApiError.badRequest('Order is not paid');
            }

            const refund = await stripeConnectService.createRefund(
                order.paymentInfo.paymentIntentId,
                amount,
                reason
            );

            order.paymentStatus = 'refunded';
            order.status = 'cancelled';
            order.cancellationReason = reason || 'Refunded';
            await order.save();

            res.status(200).json({
                message: 'Refund created successfully',
                refund,
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new StripeConnectController();
