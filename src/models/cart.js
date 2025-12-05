const mongoose = require('mongoose');

/**
 * Modèle Cart :
 * - Un panier par utilisateur
 * - Validation des stocks en temps réel
 * - Calcul automatique des totaux
 * - Nettoyage automatique des paniers abandonnés
 */
const cartSchema = new mongoose.Schema({
    // Utilisateur propriétaire du panier
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true, // Un seul panier par utilisateur
        index: true,
    },

    // Articles dans le panier
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, 'Quantity must be at least 1'],
            max: [100, 'Quantity cannot exceed 100'],
            default: 1,
        },
        // Prix au moment de l'ajout (pour historique)
        priceAtAdd: {
            type: Number,
            required: true,
        },
        addedAt: {
            type: Date,
            default: Date.now,
        },
    }],

    // Totaux (calculés automatiquement)
    totals: {
        subtotal: {
            type: Number,
            default: 0,
        },
        itemsCount: {
            type: Number,
            default: 0,
        },
    },

    // Dernière activité (pour nettoyage automatique)
    lastActivity: {
        type: Date,
        default: Date.now,
        index: true,
    },

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Index pour nettoyage automatique des paniers abandonnés (30 jours)
cartSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

/**
 * Méthode pour ajouter un produit au panier
 */
cartSchema.methods.addItem = async function (product, quantity = 1) {
    // Vérifier si le produit existe déjà dans le panier
    const existingItemIndex = this.items.findIndex(
        item => item.product.toString() === product._id.toString()
    );

    if (existingItemIndex > -1) {
        // Mettre à jour la quantité
        this.items[existingItemIndex].quantity += quantity;
    } else {
        // Ajouter un nouvel article
        this.items.push({
            product: product._id,
            quantity,
            priceAtAdd: product.price,
        });
    }

    this.lastActivity = Date.now();
    await this.calculateTotals();
    return this.save();
};

/**
 * Méthode pour mettre à jour la quantité d'un produit
 */
cartSchema.methods.updateItemQuantity = async function (productId, quantity) {
    const itemIndex = this.items.findIndex(
        item => item.product.toString() === productId.toString()
    );

    if (itemIndex === -1) {
        throw new Error('Product not found in cart');
    }

    if (quantity <= 0) {
        // Supprimer l'article si quantité <= 0
        this.items.splice(itemIndex, 1);
    } else {
        this.items[itemIndex].quantity = quantity;
    }

    this.lastActivity = Date.now();
    await this.calculateTotals();
    return this.save();
};

/**
 * Méthode pour supprimer un produit du panier
 */
cartSchema.methods.removeItem = async function (productId) {
    this.items = this.items.filter(
        item => item.product.toString() !== productId.toString()
    );

    this.lastActivity = Date.now();
    await this.calculateTotals();
    return this.save();
};

/**
 * Méthode pour vider le panier
 */
cartSchema.methods.clearCart = async function () {
    this.items = [];
    this.totals = {
        subtotal: 0,
        itemsCount: 0,
    };
    this.lastActivity = Date.now();
    return this.save();
};

/**
 * Méthode pour calculer les totaux
 */
cartSchema.methods.calculateTotals = async function () {
    // Peupler les produits pour obtenir les prix actuels
    await this.populate('items.product');

    let subtotal = 0;
    let itemsCount = 0;

    this.items.forEach(item => {
        if (item.product && !item.product.deleted && item.product.status === 'published') {
            // Utiliser le prix actuel du produit
            subtotal += item.product.price * item.quantity;
            itemsCount += item.quantity;
        }
    });

    this.totals = {
        subtotal,
        itemsCount,
    };
};

/**
 * Méthode pour valider la disponibilité des produits
 */
cartSchema.methods.validateAvailability = async function () {
    await this.populate('items.product');

    const unavailableItems = [];
    const outOfStockItems = [];

    this.items.forEach(item => {
        if (!item.product) {
            unavailableItems.push({
                productId: item.product,
                reason: 'Product not found',
            });
        } else if (item.product.deleted) {
            unavailableItems.push({
                productId: item.product._id,
                productName: item.product.title,
                reason: 'Product has been deleted',
            });
        } else if (item.product.status !== 'published') {
            unavailableItems.push({
                productId: item.product._id,
                productName: item.product.title,
                reason: 'Product is not available',
            });
        } else if (item.product.stock < item.quantity) {
            outOfStockItems.push({
                productId: item.product._id,
                productName: item.product.title,
                requestedQuantity: item.quantity,
                availableStock: item.product.stock,
            });
        }
    });

    return {
        isValid: unavailableItems.length === 0 && outOfStockItems.length === 0,
        unavailableItems,
        outOfStockItems,
    };
};

/**
 * Hook pre-save pour mettre à jour lastActivity
 */
cartSchema.pre('save', function (next) {
    this.lastActivity = Date.now();
    next();
});

/**
 * Méthode statique pour obtenir ou créer un panier
 */
cartSchema.statics.getOrCreateCart = async function (userId) {
    let cart = await this.findOne({ user: userId })
        .populate({
            path: 'items.product',
            select: 'title price originalPrice stock images status deleted seller',
            populate: {
                path: 'seller',
                select: 'fullname email',
            },
        });

    if (!cart) {
        cart = await this.create({ user: userId });
        await cart.populate({
            path: 'items.product',
            select: 'title price originalPrice stock images status deleted seller',
        });
    }

    // Recalculer les totaux avec les prix actuels
    await cart.calculateTotals();
    await cart.save();

    return cart;
};

/**
 * Méthode statique pour nettoyer les articles invalides
 */
cartSchema.statics.cleanInvalidItems = async function (userId) {
    const cart = await this.findOne({ user: userId }).populate('items.product');

    if (!cart) return null;

    // Filtrer les articles invalides
    cart.items = cart.items.filter(item => {
        return item.product &&
            !item.product.deleted &&
            item.product.status === 'published';
    });

    await cart.calculateTotals();
    await cart.save();

    return cart;
};

module.exports = mongoose.model('Cart', cartSchema);
