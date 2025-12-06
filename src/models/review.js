const mongoose = require('mongoose');
const Product = require('./product');

/**
 * Modèle Review (Avis)
 * 
 * Gère les avis et notes des utilisateurs sur les produits.
 * Inclut le calcul automatique de la moyenne sur le produit.
 */
const reviewSchema = new mongoose.Schema({
    // Auteur de l'avis
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Review must belong to a user'],
    },

    // Produit concerné
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Review must belong to a product'],
    },

    // Note (1 à 5 étoiles)
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot be more than 5'],
    },

    // Commentaire
    comment: {
        type: String,
        required: [true, 'Comment is required'],
        trim: true,
        minlength: [10, 'Comment must be at least 10 characters'],
        maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },

    // Achat vérifié ? (Calculé lors de la création)
    isVerifiedPurchase: {
        type: Boolean,
        default: false,
    },

    // Statut de modération
    status: {
        type: String,
        enum: ['visible', 'hidden', 'flagged'],
        default: 'visible',
    },

    // Votes utiles (utilisateurs qui ont trouvé cet avis utile)
    helpfulVotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],

    // Soft delete
    deleted: {
        type: Boolean,
        default: false,
        index: true,
    },

    deletedAt: Date,

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Index unique : Un utilisateur ne peut laisser qu'un seul avis par produit
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Méthode statique pour calculer la moyenne des notes
reviewSchema.statics.calcAverageRatings = async function (productId) {
    const stats = await this.aggregate([
        {
            $match: { product: productId, deleted: false, status: 'visible' }
        },
        {
            $group: {
                _id: '$product',
                nRating: { $sum: 1 },
                avgRating: { $avg: '$rating' }
            }
        }
    ]);

    if (stats.length > 0) {
        await Product.findByIdAndUpdate(productId, {
            reviewCount: stats[0].nRating,
            averageRating: Math.round(stats[0].avgRating * 10) / 10 // Arrondir à 1 décimale
        });
    } else {
        await Product.findByIdAndUpdate(productId, {
            reviewCount: 0,
            averageRating: 0 // Par défaut 0 (ou 4.5 si vous voulez tricher, mais restons honnêtes)
        });
    }
};

// Hook post-save : Recalculer après création/modification
reviewSchema.post('save', function () {
    // this.constructor pointe vers le modèle Review
    this.constructor.calcAverageRatings(this.product);
});

// Hook pre-findOneAnd... pour récupérer le document avant update/delete
reviewSchema.pre(/^findOneAnd/, async function (next) {
    this.r = await this.clone().findOne();
    next();
});

// Hook post-findOneAnd... pour recalculer après update/delete
reviewSchema.post(/^findOneAnd/, async function () {
    if (this.r) {
        await this.r.constructor.calcAverageRatings(this.r.product);
    }
});

module.exports = mongoose.model('Review', reviewSchema);
