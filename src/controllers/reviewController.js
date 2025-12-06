const Review = require('../models/review');
const Product = require('../models/product');
const Order = require('../models/order');
const ApiError = require('../utils/ApiError');

class ReviewController {
    /**
     * Créer un avis
     * Vérifie automatiquement si c'est un achat vérifié
     */
    async createReview(req, res, next) {
        try {
            const { productId, rating, comment } = req.body;
            const userId = req.user.userId;

            // Vérifier si le produit existe
            const product = await Product.findOne({ _id: productId, deleted: false });
            if (!product) {
                throw ApiError.notFound('Product not found');
            }

            // Vérifier si l'utilisateur a déjà laissé un avis
            const existingReview = await Review.findOne({
                product: productId,
                user: userId,
                deleted: false,
            });

            if (existingReview) {
                throw ApiError.badRequest('You have already reviewed this product');
            }

            // Vérifier si c'est un achat vérifié
            // On cherche une commande PAYÉE contenant ce produit pour cet utilisateur
            const hasPurchased = await Order.exists({
                user: userId,
                'items.product': productId,
                paymentStatus: 'paid',
                deleted: false,
            });

            // Créer l'avis
            const review = await Review.create({
                user: userId,
                product: productId,
                rating,
                comment,
                isVerifiedPurchase: !!hasPurchased,
            });

            res.status(201).json({
                message: 'Review created successfully',
                review,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Récupérer les avis d'un produit
     * Avec pagination et filtres
     */
    async getProductReviews(req, res, next) {
        try {
            const { productId } = req.params;
            const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

            const query = {
                product: productId,
                deleted: false,
                status: 'visible',
            };

            const reviews = await Review.find(query)
                .populate('user', 'fullname profileImage')
                .sort(sort)
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const count = await Review.countDocuments(query);

            // Statistiques des notes (pour afficher les barres 5 étoiles, 4 étoiles...)
            const stats = await Review.aggregate([
                { $match: { product: new mongoose.Types.ObjectId(productId), deleted: false, status: 'visible' } },
                {
                    $group: {
                        _id: '$rating',
                        count: { $sum: 1 }
                    }
                }
            ]);

            res.status(200).json({
                reviews,
                stats,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                total: count,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Mettre à jour un avis
     * (Seulement par l'auteur)
     */
    async updateReview(req, res, next) {
        try {
            const { id } = req.params;
            const { rating, comment } = req.body;
            const userId = req.user.userId;

            const review = await Review.findOne({ _id: id, deleted: false });

            if (!review) {
                throw ApiError.notFound('Review not found');
            }

            // Vérifier que c'est bien l'auteur
            if (review.user.toString() !== userId) {
                throw ApiError.forbidden('You can only update your own reviews');
            }

            review.rating = rating || review.rating;
            review.comment = comment || review.comment;

            // Si l'avis était caché/flagged, le remettre en visible après modif (ou le garder en modération selon politique)
            // Ici on le laisse visible par défaut

            await review.save();

            res.status(200).json({
                message: 'Review updated successfully',
                review,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Supprimer un avis
     * (Auteur ou Admin)
     */
    async deleteReview(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const userRole = req.user.role;

            const review = await Review.findOne({ _id: id, deleted: false });

            if (!review) {
                throw ApiError.notFound('Review not found');
            }

            // Vérifier permissions (Auteur ou Admin)
            if (review.user.toString() !== userId && userRole !== 'admin') {
                throw ApiError.forbidden('You are not authorized to delete this review');
            }

            // Soft delete
            review.deleted = true;
            review.deletedAt = new Date();
            await review.save();

            res.status(200).json({
                message: 'Review deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Voter "Utile" pour un avis
     */
    async voteHelpful(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;

            const review = await Review.findOne({ _id: id, deleted: false });

            if (!review) {
                throw ApiError.notFound('Review not found');
            }

            // Vérifier si l'utilisateur a déjà voté
            const hasVoted = review.helpfulVotes.includes(userId);

            if (hasVoted) {
                // Retirer le vote
                review.helpfulVotes = review.helpfulVotes.filter(id => id.toString() !== userId);
            } else {
                // Ajouter le vote
                review.helpfulVotes.push(userId);
            }

            await review.save();

            res.status(200).json({
                message: hasVoted ? 'Vote removed' : 'Vote added',
                helpfulCount: review.helpfulVotes.length,
            });
        } catch (error) {
            next(error);
        }
    }
}

// Nécessaire pour l'agrégation dans getProductReviews
const mongoose = require('mongoose');

module.exports = new ReviewController();
