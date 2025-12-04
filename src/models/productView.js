const mongoose = require('mongoose');

/**
 * Modèle pour tracker les vues de produits
 * Permet d'éviter le spam et les vues multiples du même utilisateur/IP
 */
const productViewSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true,
    },

    // Utilisateur connecté (si authentifié)
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },

    // Adresse IP (pour utilisateurs non connectés)
    ipAddress: {
        type: String,
        index: true,
    },

    // User Agent (pour détecter les bots)
    userAgent: {
        type: String,
    },

    // Date de la vue
    viewedAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
}, {
    timestamps: true,
});

// Index composé pour éviter les doublons (1 vue par user/IP par produit par jour)
productViewSchema.index({ product: 1, user: 1, viewedAt: 1 });
productViewSchema.index({ product: 1, ipAddress: 1, viewedAt: 1 });

// TTL Index : Supprimer automatiquement les vues après 90 jours
productViewSchema.index({ viewedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

/**
 * Méthode statique pour vérifier si une vue doit être comptée
 * @param {ObjectId} productId - ID du produit
 * @param {ObjectId|null} userId - ID de l'utilisateur (null si non connecté)
 * @param {String} ipAddress - Adresse IP
 * @returns {Boolean} - true si la vue doit être comptée
 */
productViewSchema.statics.shouldCountView = async function (productId, userId, ipAddress) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Vérifier si l'utilisateur connecté a déjà vu ce produit dans les dernières 24h
    if (userId) {
        const existingView = await this.findOne({
            product: productId,
            user: userId,
            viewedAt: { $gte: oneDayAgo },
        });

        if (existingView) {
            return false;
        }
    }

    // Vérifier si cette IP a déjà vu ce produit dans les dernières 24h
    const existingIpView = await this.findOne({
        product: productId,
        ipAddress: ipAddress,
        viewedAt: { $gte: oneDayAgo },
    });

    return !existingIpView;
};

/**
 * Méthode statique pour enregistrer une vue
 * @param {ObjectId} productId - ID du produit
 * @param {ObjectId|null} userId - ID de l'utilisateur
 * @param {String} ipAddress - Adresse IP
 * @param {String} userAgent - User Agent
 */
productViewSchema.statics.recordView = async function (productId, userId, ipAddress, userAgent) {
    await this.create({
        product: productId,
        user: userId,
        ipAddress,
        userAgent,
    });
};

/**
 * Méthode statique pour obtenir les statistiques de vues
 * @param {ObjectId} productId - ID du produit
 * @returns {Object} - Statistiques
 */
productViewSchema.statics.getViewStats = async function (productId) {
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [total, today, thisWeek, thisMonth] = await Promise.all([
        this.countDocuments({ product: productId }),
        this.countDocuments({ product: productId, viewedAt: { $gte: oneDayAgo } }),
        this.countDocuments({ product: productId, viewedAt: { $gte: oneWeekAgo } }),
        this.countDocuments({ product: productId, viewedAt: { $gte: oneMonthAgo } }),
    ]);

    return {
        total,
        today,
        thisWeek,
        thisMonth,
    };
};

module.exports = mongoose.model('ProductView', productViewSchema);
