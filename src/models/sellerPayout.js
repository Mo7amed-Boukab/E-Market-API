const mongoose = require('mongoose');

/**
 * Modèle SellerPayout
 * 
 * Gère les paiements de la plateforme vers les sellers
 * (Utilisé uniquement pour la méthode simple)
 */
const sellerPayoutSchema = new mongoose.Schema({
    // Seller concerné
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },

    // Période concernée
    period: {
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
    },

    // Commandes incluses dans ce paiement
    orders: [{
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
        },
        orderNumber: String,
        amount: Number,
        date: Date,
    }],

    // Montants
    amounts: {
        totalSales: {
            type: Number,
            required: true,
            default: 0,
        },
        platformFee: {
            type: Number,
            required: true,
            default: 0,
        },
        sellerAmount: {
            type: Number,
            required: true,
            default: 0,
        },
    },

    // Statut du paiement
    status: {
        type: String,
        enum: ['pending', 'processing', 'paid', 'failed'],
        default: 'pending',
        index: true,
    },

    // Méthode de paiement
    paymentMethod: {
        type: String,
        enum: ['bank_transfer', 'stripe_transfer', 'other'],
        default: 'bank_transfer',
    },

    // Informations de paiement
    paymentInfo: {
        transactionId: String,
        paidAt: Date,
        reference: String,
        notes: String,
    },

    // Informations bancaires du seller (snapshot)
    sellerBankInfo: {
        accountHolder: String,
        iban: String,
        bankName: String,
    },

    // Admin qui a traité
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },

    // Historique des changements
    statusHistory: [{
        status: String,
        date: {
            type: Date,
            default: Date.now,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        comment: String,
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
});

// Index composés
sellerPayoutSchema.index({ seller: 1, status: 1 });
sellerPayoutSchema.index({ 'period.startDate': 1, 'period.endDate': 1 });
sellerPayoutSchema.index({ deleted: 1, status: 1 });

// Méthode pour calculer les montants
sellerPayoutSchema.methods.calculateAmounts = function (platformFeePercent = 5) {
    const totalSales = this.orders.reduce((sum, order) => sum + order.amount, 0);
    const platformFee = (totalSales * platformFeePercent) / 100;
    const sellerAmount = totalSales - platformFee;

    this.amounts = {
        totalSales: Math.round(totalSales * 100) / 100,
        platformFee: Math.round(platformFee * 100) / 100,
        sellerAmount: Math.round(sellerAmount * 100) / 100,
    };

    return this.amounts;
};

// Méthode pour marquer comme payé
sellerPayoutSchema.methods.markAsPaid = function (transactionId, paidBy, notes = '') {
    this.status = 'paid';
    this.paymentInfo.paidAt = new Date();
    this.paymentInfo.transactionId = transactionId;
    this.paymentInfo.notes = notes;
    this.processedBy = paidBy;

    this.statusHistory.push({
        status: 'paid',
        updatedBy: paidBy,
        comment: notes,
    });

    return this.save();
};

// Méthode pour soft delete
sellerPayoutSchema.methods.softDelete = function () {
    this.deleted = true;
    this.deletedAt = new Date();
    return this.save();
};

// Query helper pour exclure les supprimés
sellerPayoutSchema.query.notDeleted = function () {
    return this.where({ deleted: false });
};

module.exports = mongoose.model('SellerPayout', sellerPayoutSchema);
