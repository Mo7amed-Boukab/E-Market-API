const mongoose = require('mongoose');

/**
 * Modèle Wishlist (Favoris)
 * 
 * Stocke les produits favoris des utilisateurs.
 */
const wishlistSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },

    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },

    // Note personnelle optionnelle (ex: "Pour mon anniversaire")
    note: {
        type: String,
        trim: true,
        maxlength: [200, 'Note cannot exceed 200 characters'],
    },

}, {
    timestamps: true,
});

// Index composé UNIQUE : Un user ne peut ajouter le même produit qu'une seule fois
wishlistSchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);
