const SellerPayout = require('../models/sellerPayout');
const Order = require('../models/order');
const User = require('../models/user');
const ApiError = require('../utils/ApiError');

/**
 * Controller pour gérer les paiements aux sellers (Admin uniquement)
 */
class SellerPayoutController {
    /**
     * Calculer les montants dus aux sellers
     */
    async calculatePendingPayouts(req, res, next) {
        try {
            const { startDate, endDate } = req.query;

            // Récupérer toutes les commandes payées sans Stripe Connect
            const orders = await Order.find({
                paymentStatus: 'paid',
                'paymentInfo.paymentMethod': { $ne: 'connect' }, // Exclure Stripe Connect
                deleted: false,
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate),
                },
            }).populate('items.seller', 'fullname email stripeAccountId');

            // Grouper par seller
            const sellerOrders = {};

            for (const order of orders) {
                for (const item of order.items) {
                    const sellerId = item.seller._id.toString();

                    // Ignorer si le seller a Stripe Connect
                    if (item.seller.stripeAccountId) continue;

                    if (!sellerOrders[sellerId]) {
                        sellerOrders[sellerId] = {
                            seller: item.seller,
                            orders: [],
                            totalAmount: 0,
                        };
                    }

                    const itemAmount = item.price * item.quantity;
                    sellerOrders[sellerId].orders.push({
                        orderId: order._id,
                        orderNumber: order.orderNumber,
                        amount: itemAmount,
                        date: order.createdAt,
                    });
                    sellerOrders[sellerId].totalAmount += itemAmount;
                }
            }

            // Calculer les montants avec commission
            const payouts = Object.values(sellerOrders).map(data => {
                const platformFee = (data.totalAmount * 5) / 100;
                const sellerAmount = data.totalAmount - platformFee;

                return {
                    seller: {
                        id: data.seller._id,
                        name: data.seller.fullname,
                        email: data.seller.email,
                    },
                    ordersCount: data.orders.length,
                    totalSales: data.totalAmount,
                    platformFee,
                    sellerAmount,
                    orders: data.orders,
                };
            });

            res.status(200).json({
                period: { startDate, endDate },
                sellersCount: payouts.length,
                totalAmount: payouts.reduce((sum, p) => sum + p.totalSales, 0),
                totalPlatformFee: payouts.reduce((sum, p) => sum + p.platformFee, 0),
                totalSellerAmount: payouts.reduce((sum, p) => sum + p.sellerAmount, 0),
                payouts,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Créer un payout pour un seller
     */
    async createPayout(req, res, next) {
        try {
            const { sellerId, startDate, endDate, orders } = req.body;
            const adminId = req.user.userId;

            // Vérifier que le seller existe
            const seller = await User.findById(sellerId);
            if (!seller || seller.role !== 'seller') {
                throw ApiError.notFound('Seller not found');
            }

            // Vérifier qu'il n'y a pas déjà un payout pour cette période
            const existingPayout = await SellerPayout.findOne({
                seller: sellerId,
                'period.startDate': new Date(startDate),
                'period.endDate': new Date(endDate),
                deleted: false,
            });

            if (existingPayout) {
                throw ApiError.badRequest('A payout already exists for this period');
            }

            // Créer le payout
            const payout = new SellerPayout({
                seller: sellerId,
                period: {
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                },
                orders: orders.map(o => ({
                    order: o.orderId,
                    orderNumber: o.orderNumber,
                    amount: o.amount,
                    date: o.date,
                })),
                sellerBankInfo: {
                    accountHolder: req.body.accountHolder,
                    iban: req.body.iban,
                    bankName: req.body.bankName,
                },
                processedBy: adminId,
            });

            // Calculer les montants
            payout.calculateAmounts(5);

            await payout.save();

            await payout.populate([
                { path: 'seller', select: 'fullname email' },
                { path: 'processedBy', select: 'fullname' },
            ]);

            res.status(201).json({
                message: 'Payout created successfully',
                payout,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Liste des payouts
     */
    async getAllPayouts(req, res, next) {
        try {
            const { page = 1, limit = 20, status, sellerId } = req.query;

            const query = { deleted: false };

            if (status) {
                query.status = status;
            }

            if (sellerId) {
                query.seller = sellerId;
            }

            const payouts = await SellerPayout.find(query)
                .populate('seller', 'fullname email')
                .populate('processedBy', 'fullname')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const count = await SellerPayout.countDocuments(query);

            res.status(200).json({
                payouts,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                total: count,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Détails d'un payout
     */
    async getPayoutById(req, res, next) {
        try {
            const { id } = req.params;

            const payout = await SellerPayout.findOne({
                _id: id,
                deleted: false,
            })
                .populate('seller', 'fullname email phone')
                .populate('processedBy', 'fullname email')
                .populate('orders.order', 'orderNumber status');

            if (!payout) {
                throw ApiError.notFound('Payout not found');
            }

            res.status(200).json({ payout });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Marquer un payout comme payé
     */
    async markAsPaid(req, res, next) {
        try {
            const { id } = req.params;
            const { transactionId, notes } = req.body;
            const adminId = req.user.userId;

            const payout = await SellerPayout.findOne({
                _id: id,
                deleted: false,
            });

            if (!payout) {
                throw ApiError.notFound('Payout not found');
            }

            if (payout.status === 'paid') {
                throw ApiError.badRequest('Payout is already paid');
            }

            await payout.markAsPaid(transactionId, adminId, notes);

            await payout.populate([
                { path: 'seller', select: 'fullname email' },
                { path: 'processedBy', select: 'fullname' },
            ]);

            res.status(200).json({
                message: 'Payout marked as paid',
                payout,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Mettre à jour le statut d'un payout
     */
    async updatePayoutStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status, comment } = req.body;
            const adminId = req.user.userId;

            const payout = await SellerPayout.findOne({
                _id: id,
                deleted: false,
            });

            if (!payout) {
                throw ApiError.notFound('Payout not found');
            }

            payout.status = status;
            payout.statusHistory.push({
                status,
                updatedBy: adminId,
                comment,
            });

            await payout.save();

            await payout.populate([
                { path: 'seller', select: 'fullname email' },
                { path: 'processedBy', select: 'fullname' },
            ]);

            res.status(200).json({
                message: 'Payout status updated',
                payout,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Statistiques des payouts
     */
    async getPayoutStats(req, res, next) {
        try {
            const stats = await SellerPayout.aggregate([
                { $match: { deleted: false } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$amounts.sellerAmount' },
                    },
                },
            ]);

            const totalStats = await SellerPayout.aggregate([
                { $match: { deleted: false } },
                {
                    $group: {
                        _id: null,
                        totalPayouts: { $sum: 1 },
                        totalSales: { $sum: '$amounts.totalSales' },
                        totalPlatformFee: { $sum: '$amounts.platformFee' },
                        totalSellerAmount: { $sum: '$amounts.sellerAmount' },
                    },
                },
            ]);

            res.status(200).json({
                byStatus: stats,
                overall: totalStats[0] || {
                    totalPayouts: 0,
                    totalSales: 0,
                    totalPlatformFee: 0,
                    totalSellerAmount: 0,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Supprimer un payout
     */
    async deletePayout(req, res, next) {
        try {
            const { id } = req.params;

            const payout = await SellerPayout.findOne({
                _id: id,
                deleted: false,
            });

            if (!payout) {
                throw ApiError.notFound('Payout not found');
            }

            if (payout.status === 'paid') {
                throw ApiError.badRequest('Cannot delete a paid payout');
            }

            await payout.softDelete();

            res.status(200).json({
                message: 'Payout deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SellerPayoutController();
