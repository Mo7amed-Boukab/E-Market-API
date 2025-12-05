const Cart = require('../models/cart');
const Product = require('../models/product');
const ApiError = require('../utils/ApiError');

class CartController {
    /**
     * Obtenir le panier de l'utilisateur connecté
     */
    async getCart(req, res, next) {
        try {
            const userId = req.user.userId;

            const cart = await Cart.getOrCreateCart(userId);

            // Valider la disponibilité des produits
            const validation = await cart.validateAvailability();

            res.status(200).json({
                cart,
                validation,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Ajouter un produit au panier
     */
    async addToCart(req, res, next) {
        try {
            const userId = req.user.userId;
            const { productId, quantity = 1 } = req.body;

            // Vérifier que le produit existe
            const product = await Product.findOne({
                _id: productId,
                deleted: false
            });

            if (!product) {
                throw ApiError.notFound('Product not found');
            }

            // Vérifier que le produit est publié
            if (product.status !== 'published') {
                throw ApiError.badRequest('Product is not available for purchase');
            }

            // Vérifier que le produit est public
            if (product.visibility !== 'public') {
                throw ApiError.badRequest('Product is not available for purchase');
            }

            // Vérifier le stock disponible
            if (product.stock < quantity) {
                throw ApiError.badRequest(
                    `Insufficient stock. Only ${product.stock} items available`
                );
            }

            // Obtenir ou créer le panier
            const cart = await Cart.getOrCreateCart(userId);

            // Vérifier si le produit existe déjà dans le panier
            const existingItem = cart.items.find(
                item => item.product._id.toString() === productId
            );

            if (existingItem) {
                // Vérifier le stock pour la nouvelle quantité totale
                const newQuantity = existingItem.quantity + quantity;
                if (product.stock < newQuantity) {
                    throw ApiError.badRequest(
                        `Insufficient stock. Only ${product.stock} items available, you already have ${existingItem.quantity} in cart`
                    );
                }
            }

            // Ajouter le produit au panier
            await cart.addItem(product, quantity);

            // Recharger le panier avec les produits peuplés
            const updatedCart = await Cart.getOrCreateCart(userId);

            res.status(200).json({
                message: 'Product added to cart successfully',
                cart: updatedCart,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Mettre à jour la quantité d'un produit dans le panier
     */
    async updateCartItem(req, res, next) {
        try {
            const userId = req.user.userId;
            const { productId } = req.params;
            const { quantity } = req.body;

            // Valider la quantité
            if (quantity < 0) {
                throw ApiError.badRequest('Quantity must be a positive number');
            }

            // Obtenir le panier
            const cart = await Cart.findOne({ user: userId });

            if (!cart) {
                throw ApiError.notFound('Cart not found');
            }

            // Si quantité > 0, vérifier le stock
            if (quantity > 0) {
                const product = await Product.findOne({
                    _id: productId,
                    deleted: false,
                    status: 'published'
                });

                if (!product) {
                    throw ApiError.notFound('Product not found or not available');
                }

                if (product.stock < quantity) {
                    throw ApiError.badRequest(
                        `Insufficient stock. Only ${product.stock} items available`
                    );
                }
            }

            // Mettre à jour la quantité
            await cart.updateItemQuantity(productId, quantity);

            // Recharger le panier
            const updatedCart = await Cart.getOrCreateCart(userId);

            res.status(200).json({
                message: quantity === 0 ? 'Product removed from cart' : 'Cart updated successfully',
                cart: updatedCart,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Supprimer un produit du panier
     */
    async removeFromCart(req, res, next) {
        try {
            const userId = req.user.userId;
            const { productId } = req.params;

            const cart = await Cart.findOne({ user: userId });

            if (!cart) {
                throw ApiError.notFound('Cart not found');
            }

            await cart.removeItem(productId);

            // Recharger le panier
            const updatedCart = await Cart.getOrCreateCart(userId);

            res.status(200).json({
                message: 'Product removed from cart successfully',
                cart: updatedCart,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Vider le panier
     */
    async clearCart(req, res, next) {
        try {
            const userId = req.user.userId;

            const cart = await Cart.findOne({ user: userId });

            if (!cart) {
                throw ApiError.notFound('Cart not found');
            }

            await cart.clearCart();

            res.status(200).json({
                message: 'Cart cleared successfully',
                cart,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Nettoyer les articles invalides du panier
     */
    async cleanCart(req, res, next) {
        try {
            const userId = req.user.userId;

            const cart = await Cart.cleanInvalidItems(userId);

            if (!cart) {
                throw ApiError.notFound('Cart not found');
            }

            // Recharger le panier
            const updatedCart = await Cart.getOrCreateCart(userId);

            res.status(200).json({
                message: 'Cart cleaned successfully',
                cart: updatedCart,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Valider le panier avant commande
     */
    async validateCart(req, res, next) {
        try {
            const userId = req.user.userId;

            const cart = await Cart.getOrCreateCart(userId);

            if (cart.items.length === 0) {
                throw ApiError.badRequest('Cart is empty');
            }

            // Valider la disponibilité
            const validation = await cart.validateAvailability();

            if (!validation.isValid) {
                return res.status(400).json({
                    message: 'Cart validation failed',
                    validation,
                });
            }

            res.status(200).json({
                message: 'Cart is valid',
                cart,
                validation,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Obtenir le nombre d'articles dans le panier (pour badge)
     */
    async getCartCount(req, res, next) {
        try {
            const userId = req.user.userId;

            const cart = await Cart.findOne({ user: userId });

            const count = cart ? cart.totals.itemsCount : 0;

            res.status(200).json({
                count,
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CartController();
