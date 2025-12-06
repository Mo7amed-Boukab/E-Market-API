const mongoose = require('mongoose');

/**
 * Modèle Notification (In-App)
 * 
 * Stocke les alertes visibles dans le dashboard utilisateur/vendeur.
 * Optimisé avec TTL pour nettoyage automatique.
 */
const notificationSchema = new mongoose.Schema({
    // Destinataire
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },

    // Type de notification (pour le style frontend : icône, couleur...)
    type: {
        type: String,
        enum: ['info', 'success', 'warning', 'error', 'order', 'system'],
        default: 'info',
    },

    // Contenu
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
    },

    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500,
    },

    // Lien d'action (ex: "/orders/123")
    link: {
        type: String,
        trim: true,
    },

    // Métadonnées (ex: ID de la commande liée)
    data: {
        type: mongoose.Schema.Types.Mixed,
    },

    // Statut de lecture
    isRead: {
        type: Boolean,
        default: false,
        index: true,
    },

    // Soft delete (au cas où)
    deleted: {
        type: Boolean,
        default: false,
    },

}, {
    timestamps: true,
});

// Index composé pour récupérer rapidement les notifs non lues d'un user
notificationSchema.index({ recipient: 1, isRead: 1 });

// TTL Index : Supprimer automatiquement les notifications après 30 jours
// pour garder la base de données légère (Scalabilité)
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', notificationSchema);
