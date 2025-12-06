const paymentService = require('../services/paymentService');
const Order = require('../models/order');
const ApiError = require('../utils/ApiError');

class PaymentController {
    /**
     * Créer une intention de paiement pour une commande
     */
    async createPaymentIntent(req, res, next) {
        try {
            const { orderId } = req.body;
            const userId = req.user.userId;

            // Récupérer la commande
            const order = await Order.findOne({
                _id: orderId,
                user: userId,
                deleted: false,
            });

            if (!order) {
                throw ApiError.notFound('Order not found');
            }

            // Vérifier que la commande n'est pas déjà payée
            if (order.paymentStatus === 'paid') {
                throw ApiError.badRequest('Order is already paid');
            }

            // Vérifier que la commande n'est pas annulée
            if (order.status === 'cancelled') {
                throw ApiError.badRequest('Cannot pay for a cancelled order');
            }

            // Créer la Payment Intent sur Stripe
            const paymentIntent = await paymentService.createPaymentIntent(
                order.pricing.total,
                'mad', // Dirham Marocain
                {
                    orderId: order._id.toString(),
                    orderNumber: order.orderNumber,
                    userId: userId,
                }
            );

            // Mettre à jour la commande avec les infos de paiement
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
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Webhook Stripe pour recevoir les événements de paiement
     */
    async handleWebhook(req, res, next) {
        try {
            const signature = req.headers['stripe-signature'];
            const payload = req.body;

            // Vérifier la signature du webhook
            const event = paymentService.verifyWebhookSignature(payload, signature);

            // Traiter l'événement
            const result = await paymentService.handleWebhookEvent(event);

            // Mettre à jour la commande selon le type d'événement
            if (result.type === 'payment_succeeded') {
                const order = await Order.findOne({
                    'paymentInfo.paymentIntentId': result.paymentIntentId,
                });

                if (order) {
                    order.paymentStatus = 'paid';
                    order.paymentInfo.paidAt = new Date();
                    order.paymentInfo.transactionId = result.paymentIntentId;

                    // Confirmer automatiquement la commande
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
     * Vérifier le statut d'un paiement
     */
    async checkPaymentStatus(req, res, next) {
        try {
            const { orderId } = req.params;
            const userId = req.user.userId;

            const order = await Order.findOne({
                _id: orderId,
                user: userId,
                deleted: false,
            });

            if (!order) {
                throw ApiError.notFound('Order not found');
            }

            let paymentDetails = null;

            if (order.paymentInfo?.paymentIntentId) {
                paymentDetails = await paymentService.getPaymentIntent(
                    order.paymentInfo.paymentIntentId
                );
            }

            res.status(200).json({
                orderId: order._id,
                orderNumber: order.orderNumber,
                paymentStatus: order.paymentStatus,
                paymentMethod: order.paymentMethod,
                amount: order.pricing.total,
                paymentDetails,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Créer un remboursement (Admin/Seller)
     */
    async createRefund(req, res, next) {
        try {
            const { orderId } = req.params;
            const { amount, reason } = req.body;
            const userId = req.user.userId;
            const userRole = req.user.role;

            const order = await Order.findOne({
                _id: orderId,
                deleted: false,
            });

            if (!order) {
                throw ApiError.notFound('Order not found');
            }

            // RÈGLE : Seul le seller propriétaire peut rembourser
            const isSeller = order.items.some(item => item.seller.toString() === userId);

            if (!isSeller) {
                throw ApiError.forbidden(
                    'Only the seller can refund this order. It is the seller\'s money that will be refunded.'
                );
            }

            // Vérifier que la commande est payée
            if (order.paymentStatus !== 'paid') {
                throw ApiError.badRequest('Order is not paid');
            }

            // Créer le remboursement sur Stripe
            const refund = await paymentService.createRefund(
                order.paymentInfo.paymentIntentId,
                amount,
                reason
            );

            // Mettre à jour la commande
            order.paymentStatus = 'refunded';
            order.status = 'cancelled';
            order.cancellationReason = reason || 'Refunded';
            await order.save();

            res.status(200).json({
                message: 'Refund created successfully',
                refund,
                order: {
                    id: order._id,
                    orderNumber: order.orderNumber,
                    paymentStatus: order.paymentStatus,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtenir la configuration publique Stripe (pour le frontend)
     */
    async getPublicConfig(req, res, next) {
        try {
            res.status(200).json({
                publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
                currency: 'mad',
                country: 'MA',
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new PaymentController();
