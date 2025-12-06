const Order = require('../models/order');
const Cart = require('../models/cart');
const Product = require('../models/product');
const ApiError = require('../utils/ApiError');

class OrderController {
    /**
     * Créer une commande depuis le panier
     */
    async createOrder(req, res, next) {
        try {
            const userId = req.user.userId;
            const { shippingAddress, paymentMethod, notes } = req.body;

            // Récupérer le panier
            const cart = await Cart.findOne({ user: userId }).populate('items.product');

            if (!cart || cart.items.length === 0) {
                throw ApiError.badRequest('Cart is empty');
            }

            // Valider la disponibilité des produits
            const validation = await cart.validateAvailability();
            if (!validation.isValid) {
                return res.status(400).json({
                    message: 'Some products are not available',
                    validation,
                });
            }

            // Préparer les items de la commande avec snapshot
            const orderItems = [];

            for (const item of cart.items) {
                const product = item.product;

                // Vérifier le stock une dernière fois
                if (product.stock < item.quantity) {
                    throw ApiError.badRequest(
                        `Insufficient stock for ${product.title}. Only ${product.stock} available`
                    );
                }

                orderItems.push({
                    product: product._id,
                    productSnapshot: {
                        title: product.title,
                        price: product.price,
                        images: product.images.slice(0, 1), // Première image uniquement
                    },
                    quantity: item.quantity,
                    price: product.price,
                    seller: product.seller,
                });

                // Déduire le stock
                product.stock -= item.quantity;
                product.stats.sales += item.quantity;
                await product.save();
            }

            // Créer la commande
            const order = new Order({
                user: userId,
                items: orderItems,
                shippingAddress,
                paymentMethod: paymentMethod || 'cash_on_delivery',
                notes,
            });

            // Calculer les totaux
            order.calculateTotals();

            await order.save();

            // Vider le panier
            await cart.clearCart();

            // Peupler pour la réponse
            await order.populate([
                { path: 'user', select: 'fullname email' },
                { path: 'items.product', select: 'title price images' },
            ]);

            res.status(201).json({
                message: 'Order created successfully',
                order,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtenir toutes les commandes de l'utilisateur connecté
     */
    async getMyOrders(req, res, next) {
        try {
            const userId = req.user.userId;
            const { page = 1, limit = 10, status } = req.query;

            const filter = { user: userId, deleted: false };

            if (status) {
                filter.status = status;
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const orders = await Order.find(filter)
                .populate('items.product', 'title images')
                .sort('-createdAt')
                .skip(skip)
                .limit(parseInt(limit));

            const total = await Order.countDocuments(filter);

            res.status(200).json({
                count: orders.length,
                total,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit)),
                },
                orders,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtenir les détails d'une commande
     */
    async getOrderById(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const userRole = req.user.role;

            const order = await Order.findOne({ _id: id, deleted: false })
                .populate('user', 'fullname email')
                .populate('items.product', 'title price images')
                .populate('items.seller', 'fullname email');

            if (!order) {
                throw ApiError.notFound('Order not found');
            }

            // Vérifier les permissions
            const isOwner = order.user._id.toString() === userId;
            const isSeller = order.items.some(item => item.seller._id.toString() === userId);
            const isAdmin = userRole === 'admin';

            if (!isOwner && !isSeller && !isAdmin) {
                throw ApiError.forbidden('You do not have permission to view this order');
            }

            res.status(200).json({ order });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Mettre à jour le statut d'une commande (Seller uniquement)
     * Admin peut uniquement annuler en cas de litige (via cancelOrder)
     */
    async updateOrderStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status, comment } = req.body;
            const userId = req.user.userId;
            const userRole = req.user.role;

            const order = await Order.findOne({ _id: id, deleted: false });

            if (!order) {
                throw ApiError.notFound('Order not found');
            }

            // Vérifier les permissions
            const isSeller = order.items.some(item => item.seller.toString() === userId);

            // RÈGLE IMPORTANTE : Seul le seller propriétaire peut gérer le cycle de vie de sa commande
            // L'admin ne peut PAS modifier le statut (respect de la propriété du seller)
            if (!isSeller) {
                throw ApiError.forbidden(
                    'Only the seller can update order status. Sellers manage their own orders independently.'
                );
            }

            // Vérifier si le changement de statut est valide
            if (!order.canUpdateStatus(status)) {
                throw ApiError.badRequest(
                    `Cannot change status from ${order.status} to ${status}`
                );
            }

            // Mettre à jour le statut
            order.status = status;

            // Ajouter le commentaire à l'historique
            if (order.statusHistory.length > 0) {
                order.statusHistory[order.statusHistory.length - 1].comment = comment;
                order.statusHistory[order.statusHistory.length - 1].updatedBy = userId;
            }

            await order.save();

            await order.populate([
                { path: 'user', select: 'fullname email' },
                { path: 'items.product', select: 'title price images' },
            ]);

            res.status(200).json({
                message: 'Order status updated successfully',
                order,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Annuler une commande
     * - User : Peut annuler sa propre commande (avant processing)
     * - Seller : Peut annuler les commandes de ses produits
     * - Admin : Peut annuler UNIQUEMENT en cas de litige/fraude (raison obligatoire min 20 chars)
     */
    async cancelOrder(req, res, next) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const userId = req.user.userId;
            const userRole = req.user.role;

            const order = await Order.findOne({ _id: id, deleted: false });

            if (!order) {
                throw ApiError.notFound('Order not found');
            }

            // Vérifier les permissions
            const isOwner = order.user.toString() === userId;
            const isSeller = order.items.some(item => item.seller.toString() === userId);
            const isAdmin = userRole === 'admin';

            // RÈGLE : Admin peut annuler UNIQUEMENT en cas de litige avec raison détaillée
            if (isAdmin && !isOwner && !isSeller) {
                // Admin doit fournir une raison détaillée (min 20 caractères)
                if (!reason || reason.trim().length < 20) {
                    throw ApiError.badRequest(
                        'Admin must provide a detailed reason (min 20 characters) for cancelling orders. This action should only be used for disputes or fraud cases.'
                    );
                }
            } else if (!isOwner && !isSeller && !isAdmin) {
                throw ApiError.forbidden('You do not have permission to cancel this order');
            }

            // Vérifier si la commande peut être annulée
            if (!order.canBeCancelled()) {
                throw ApiError.badRequest(
                    `Cannot cancel order with status: ${order.status}`
                );
            }

            // Restaurer les stocks
            for (const item of order.items) {
                const product = await Product.findById(item.product);
                if (product) {
                    product.stock += item.quantity;
                    product.stats.sales -= item.quantity;
                    await product.save();
                }
            }

            // Annuler la commande
            order.status = 'cancelled';
            order.cancellationReason = reason || 'No reason provided';

            await order.save();

            await order.populate([
                { path: 'user', select: 'fullname email' },
                { path: 'items.product', select: 'title price images' },
            ]);

            res.status(200).json({
                message: 'Order cancelled successfully',
                order,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtenir toutes les commandes (Admin uniquement)
     */
    async getAllOrders(req, res, next) {
        try {
            const { page = 1, limit = 20, status, userId: filterUserId } = req.query;

            const filter = { deleted: false };

            if (status) {
                filter.status = status;
            }

            if (filterUserId) {
                filter.user = filterUserId;
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const orders = await Order.find(filter)
                .populate('user', 'fullname email')
                .populate('items.product', 'title price')
                .sort('-createdAt')
                .skip(skip)
                .limit(parseInt(limit));

            const total = await Order.countDocuments(filter);

            res.status(200).json({
                count: orders.length,
                total,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit)),
                },
                orders,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtenir les commandes d'un seller
     */
    async getSellerOrders(req, res, next) {
        try {
            const sellerId = req.user.userId;
            const { page = 1, limit = 10, status } = req.query;

            const filter = {
                'items.seller': sellerId,
                deleted: false,
            };

            if (status) {
                filter.status = status;
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const orders = await Order.find(filter)
                .populate('user', 'fullname email')
                .populate('items.product', 'title price images')
                .sort('-createdAt')
                .skip(skip)
                .limit(parseInt(limit));

            const total = await Order.countDocuments(filter);

            res.status(200).json({
                count: orders.length,
                total,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit)),
                },
                orders,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtenir les statistiques des commandes (Admin/Seller)
     */
    async getOrderStats(req, res, next) {
        try {
            const userId = req.user.userId;
            const userRole = req.user.role;

            let filter = { deleted: false };

            // Si seller, filtrer par ses produits
            if (userRole === 'seller') {
                filter['items.seller'] = userId;
            }

            const [
                total,
                pending,
                confirmed,
                processing,
                shipped,
                delivered,
                cancelled,
                totalRevenue,
            ] = await Promise.all([
                Order.countDocuments(filter),
                Order.countDocuments({ ...filter, status: 'pending' }),
                Order.countDocuments({ ...filter, status: 'confirmed' }),
                Order.countDocuments({ ...filter, status: 'processing' }),
                Order.countDocuments({ ...filter, status: 'shipped' }),
                Order.countDocuments({ ...filter, status: 'delivered' }),
                Order.countDocuments({ ...filter, status: 'cancelled' }),
                Order.aggregate([
                    { $match: { ...filter, status: 'delivered' } },
                    { $group: { _id: null, total: { $sum: '$pricing.total' } } },
                ]),
            ]);

            res.status(200).json({
                stats: {
                    total,
                    byStatus: {
                        pending,
                        confirmed,
                        processing,
                        shipped,
                        delivered,
                        cancelled,
                    },
                    revenue: {
                        total: totalRevenue[0]?.total || 0,
                    },
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new OrderController();
