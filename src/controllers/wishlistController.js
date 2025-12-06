const Wishlist = require('../models/wishlist');
const Product = require('../models/product');
const ApiError = require('../utils/ApiError');

class WishlistController {
    /**
     * Ajouter ou Retirer un produit de la wishlist (Toggle)
     * C'est la méthode la plus UX-friendly pour le frontend (un seul bouton cœur)
     */
    async toggleWishlist(req, res, next) {
        try {
            const { productId } = req.body;
            const userId = req.user.userId;

            // Vérifier si le produit existe
            const product = await Product.findOne({ _id: productId, deleted: false });
            if (!product) {
                throw ApiError.notFound('Product not found');
            }

            // Vérifier si déjà dans la wishlist
            const existingItem = await Wishlist.findOne({
                user: userId,
                product: productId,
            });

            if (existingItem) {
                // Si existe → Supprimer
                await Wishlist.deleteOne({ _id: existingItem._id });

                return res.status(200).json({
                    message: 'Product removed from wishlist',
                    action: 'removed',
                    productId
                });
            } else {
                // Si n'existe pas → Ajouter
                await Wishlist.create({
                    user: userId,
                    product: productId,
                });

                return res.status(201).json({
                    message: 'Product added to wishlist',
                    action: 'added',
                    productId
                });
            }
        } catch (error) {
            next(error);
        }
    }

    /**
     * Récupérer la wishlist de l'utilisateur
     * Avec pagination et population des détails produits
     */
    async getMyWishlist(req, res, next) {
        try {
            const userId = req.user.userId;
            const { page = 1, limit = 20 } = req.query;

            const wishlist = await Wishlist.find({ user: userId })
                .populate({
                    path: 'product',
                    select: 'title price images slug stock averageRating reviewCount', // Champs essentiels pour l'affichage
                    match: { deleted: false, status: 'published' } // Ne pas montrer les produits supprimés
                })
                .sort('-createdAt')
                .limit(limit * 1)
                .skip((page - 1) * limit);

            // Filtrer les items null (produits supprimés ou non publiés)
            const cleanWishlist = wishlist.filter(item => item.product !== null);

            const count = await Wishlist.countDocuments({ user: userId });

            res.status(200).json({
                wishlist: cleanWishlist,
                count: cleanWishlist.length,
                total: count,
                currentPage: page,
                totalPages: Math.ceil(count / limit)
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Vérifier si des produits spécifiques sont dans la wishlist
     * Utile pour afficher les cœurs pleins/vides sur une liste de produits
     */
    async checkWishlistStatus(req, res, next) {
        try {
            const userId = req.user.userId;
            // On attend une liste d'IDs dans le body ou query, ou on renvoie tous les IDs de la wishlist

            // Option simple : renvoyer tous les IDs de produits dans la wishlist de l'user
            // Le frontend pourra comparer
            const wishlistItems = await Wishlist.find({ user: userId }).select('product');
            const productIds = wishlistItems.map(item => item.product.toString());

            res.status(200).json({
                wishlistProductIds: productIds
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new WishlistController();
