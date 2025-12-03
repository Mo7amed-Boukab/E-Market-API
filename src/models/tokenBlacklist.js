const mongoose = require('mongoose');

/**
 * Modèle pour la blacklist des tokens JWT
 * Stocke les tokens révoqués (logout, changement de mot de passe, etc.)
 */
const tokenBlacklistSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
        index: true, // Index pour recherche rapide
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    reason: {
        type: String,
        enum: ['logout', 'password_change', 'admin_revoke'],
        default: 'logout',
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true, // Index pour TTL
    },
}, {
    timestamps: true,
});

// Index TTL - MongoDB supprimera automatiquement les documents expirés
tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Méthode statique pour vérifier si un token est blacklisté
tokenBlacklistSchema.statics.isBlacklisted = async function (token) {
    const blacklisted = await this.findOne({ token });
    return !!blacklisted;
};

// Méthode statique pour ajouter un token à la blacklist
tokenBlacklistSchema.statics.addToBlacklist = async function (token, userId, expiresAt, reason = 'logout') {
    try {
        await this.create({
            token,
            userId,
            reason,
            expiresAt,
        });
        return true;
    } catch (error) {
        // Si le token existe déjà, c'est OK
        if (error.code === 11000) {
            return true;
        }
        throw error;
    }
};

// Méthode statique pour révoquer tous les tokens d'un utilisateur
tokenBlacklistSchema.statics.revokeAllUserTokens = async function (userId, reason = 'admin_revoke') {
    // Cette méthode sera utilisée lors d'un changement de mot de passe
    // ou d'une révocation admin
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

    await this.create({
        token: `user_${userId}_all_tokens`,
        userId,
        reason,
        expiresAt: futureDate,
    });
};

module.exports = mongoose.model('TokenBlacklist', tokenBlacklistSchema);
