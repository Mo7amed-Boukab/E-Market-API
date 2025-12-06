const Coupon = require('../models/coupon');
const Product = require('../models/product');
const Category = require('../models/category');
const ApiError = require('../utils/ApiError');

class CouponController {
    /**
     * Créer un coupon (Seller UNIQUEMENT)
     * L'admin ne peut PAS créer de coupons car c'est l'argent du seller qui finance la réduction
     */
    async createCoupon(req, res, next) {
        try {
            const userId = req.user.userId;
            const userRole = req.user.role;
            const {
                code,
                description,
                discountType,
                discountValue,
                minOrderAmount,
                maxDiscountAmount,
                startDate,
                expiryDate,
                usageLimit,
                restrictions,
            } = req.body;

            // RÈGLE IMPORTANTE : Seuls les sellers peuvent créer des coupons
            // Car c'est LEUR argent qui finance la réduction
            if (userRole !== 'seller') {
                throw ApiError.forbidden(
                    'Only sellers can create coupons. Coupons are financed by the seller, not the platform.'
                );
            }

            // Vérifier si le code existe déjà
            const existingCoupon = await Coupon.findOne({
                code: code.toUpperCase(),
                deleted: false
            });

            if (existingCoupon) {
                throw ApiError.badRequest('Coupon code already exists');
            }

            // Si le seller a spécifié des produits, vérifier qu'ils lui appartiennent
            if (restrictions?.products?.length > 0) {
                const products = await Product.find({
                    _id: { $in: restrictions.products },
                    seller: userId,
                    deleted: false,
                });

                if (products.length !== restrictions.products.length) {
                    throw ApiError.forbidden('You can only create coupons for your own products');
                }
            }

            // Créer le coupon (toujours lié au seller)
            const coupon = new Coupon({
                code: code.toUpperCase(),
                description,
                discountType,
                discountValue,
                minOrderAmount,
                maxDiscountAmount,
                startDate,
                expiryDate,
                usageLimit,
                restrictions: restrictions || {},
                createdBy: userId,
                seller: userId, // Toujours le seller qui crée
            });

            await coupon.save();

            res.status(201).json({
                message: 'Coupon created successfully',
                coupon,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtenir tous les coupons (Admin/Seller)
     */
    async getAllCoupons(req, res, next) {
        try {
            const userId = req.user.userId;
            const userRole = req.user.role;
            const { page = 1, limit = 20, status, search } = req.query;

            const filter = { deleted: false };

            // Si seller, voir uniquement ses coupons
            if (userRole === 'seller') {
                filter.seller = userId;
            }

            if (status) {
                filter.status = status;
            }

            if (search) {
                filter.code = { $regex: search, $options: 'i' };
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const coupons = await Coupon.find(filter)
                .populate('createdBy', 'fullname email')
                .populate('seller', 'fullname email')
                .sort('-createdAt')
                .skip(skip)
                .limit(parseInt(limit));

            const total = await Coupon.countDocuments(filter);

            res.status(200).json({
                count: coupons.length,
                total,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit)),
                },
                coupons,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtenir un coupon par ID (Admin/Seller)
     */
    async getCouponById(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const userRole = req.user.role;

            const coupon = await Coupon.findOne({ _id: id, deleted: false })
                .populate('createdBy', 'fullname email')
                .populate('seller', 'fullname email')
                .populate('restrictions.products', 'title price')
                .populate('restrictions.categories', 'name');

            if (!coupon) {
                throw ApiError.notFound('Coupon not found');
            }

            // Vérifier les permissions (seller ne peut voir que ses coupons)
            if (userRole === 'seller' && coupon.seller?.toString() !== userId) {
                throw ApiError.forbidden('You can only view your own coupons');
            }

            res.status(200).json({ coupon });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Mettre à jour un coupon (Seller propriétaire UNIQUEMENT)
     */
    async updateCoupon(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const updates = req.body;

            const coupon = await Coupon.findOne({ _id: id, deleted: false });

            if (!coupon) {
                throw ApiError.notFound('Coupon not found');
            }

            // Vérifier les permissions (seller propriétaire uniquement)
            if (coupon.seller?.toString() !== userId) {
                throw ApiError.forbidden('You can only update your own coupons');
            }

            // Ne pas permettre de modifier le code
            if (updates.code && updates.code !== coupon.code) {
                throw ApiError.badRequest('Coupon code cannot be changed');
            }

            // Mettre à jour les champs autorisés
            const allowedUpdates = [
                'description',
                'discountValue',
                'minOrderAmount',
                'maxDiscountAmount',
                'expiryDate',
                'usageLimit',
                'restrictions',
                'status',
            ];

            allowedUpdates.forEach(field => {
                if (updates[field] !== undefined) {
                    coupon[field] = updates[field];
                }
            });

            await coupon.save();

            res.status(200).json({
                message: 'Coupon updated successfully',
                coupon,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Supprimer un coupon (Seller propriétaire UNIQUEMENT)
     */
    async deleteCoupon(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;

            const coupon = await Coupon.findOne({ _id: id, deleted: false });

            if (!coupon) {
                throw ApiError.notFound('Coupon not found');
            }

            // Vérifier les permissions (seller propriétaire uniquement)
            if (coupon.seller?.toString() !== userId) {
                throw ApiError.forbidden('You can only delete your own coupons');
            }

            await coupon.softDelete();

            res.status(200).json({
                message: 'Coupon deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Valider un coupon (Public - pour affichage frontend)
     */
    async validateCoupon(req, res, next) {
        try {
            const { code } = req.params;
            const userId = req.user.userId;
            const { orderAmount, items } = req.body;

            const coupon = await Coupon.findOne({
                code: code.toUpperCase(),
                deleted: false
            });

            if (!coupon) {
                throw ApiError.notFound('Coupon not found');
            }

            // Vérifier si l'utilisateur peut utiliser le coupon
            const userCheck = coupon.canUserUse(userId);
            if (!userCheck.valid) {
                throw ApiError.badRequest(userCheck.reason);
            }

            // Vérifier le montant minimum
            if (orderAmount < coupon.minOrderAmount) {
                throw ApiError.badRequest(
                    `Minimum order amount of ${coupon.minOrderAmount} DH required`
                );
            }

            // Calculer la réduction
            const discount = coupon.calculateDiscount(orderAmount, items);

            res.status(200).json({
                valid: true,
                coupon: {
                    code: coupon.code,
                    description: coupon.description,
                    discountType: coupon.discountType,
                    discountValue: coupon.discountValue,
                },
                discount,
                finalAmount: orderAmount - discount,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Appliquer un coupon à une commande (Utilisé lors de la création de commande)
     */
    async applyCoupon(couponCode, userId, orderAmount, items = []) {
        const coupon = await Coupon.findOne({
            code: couponCode.toUpperCase(),
            deleted: false
        });

        if (!coupon) {
            throw ApiError.notFound('Coupon not found');
        }

        // Vérifier si l'utilisateur peut utiliser le coupon
        const userCheck = coupon.canUserUse(userId);
        if (!userCheck.valid) {
            throw ApiError.badRequest(userCheck.reason);
        }

        // Vérifier le montant minimum
        if (orderAmount < coupon.minOrderAmount) {
            throw ApiError.badRequest(
                `Minimum order amount of ${coupon.minOrderAmount} DH required`
            );
        }

        // Calculer la réduction
        const discount = coupon.calculateDiscount(orderAmount, items);

        // Enregistrer l'utilisation
        await coupon.recordUsage(userId);

        return {
            coupon: {
                _id: coupon._id,
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
            },
            discount,
            freeShipping: coupon.discountType === 'free_shipping',
        };
    }

    /**
     * Obtenir les statistiques d'un coupon (Admin/Seller propriétaire)
     */
    async getCouponStats(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const userRole = req.user.role;

            const coupon = await Coupon.findOne({ _id: id, deleted: false })
                .populate('usageCount.byUser.user', 'fullname email');

            if (!coupon) {
                throw ApiError.notFound('Coupon not found');
            }

            // Vérifier les permissions
            if (userRole === 'seller' && coupon.seller?.toString() !== userId) {
                throw ApiError.forbidden('You can only view stats for your own coupons');
            }

            const stats = {
                code: coupon.code,
                totalUsage: coupon.usageCount.total,
                usageLimit: coupon.usageLimit.total || 'Unlimited',
                remainingUses: coupon.usageLimit.total
                    ? coupon.usageLimit.total - coupon.usageCount.total
                    : 'Unlimited',
                uniqueUsers: coupon.usageCount.byUser.length,
                topUsers: coupon.usageCount.byUser
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10)
                    .map(u => ({
                        user: u.user,
                        usageCount: u.count,
                        lastUsed: u.lastUsed,
                    })),
                status: coupon.status,
                isValid: coupon.isValid(),
            };

            res.status(200).json({ stats });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Générer un code de coupon aléatoire (Admin/Seller)
     */
    async generateCouponCode(req, res, next) {
        try {
            const { prefix = '' } = req.query;

            let code;
            let exists = true;

            // Générer un code unique
            while (exists) {
                code = Coupon.generateCode(prefix, 8);
                exists = await Coupon.findOne({ code, deleted: false });
            }

            res.status(200).json({ code });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CouponController();
