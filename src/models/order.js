const mongoose = require('mongoose');

/**
 * Modèle Order :
 * - Gestion complète du cycle de vie d'une commande
 * - Traçabilité des statuts
 * - Validation des stocks
 * - Calcul automatique des totaux
 * - Soft delete
 */
const orderSchema = new mongoose.Schema({
    // Numéro de commande unique
    orderNumber: {
        type: String,
        unique: true,
        index: true,
    },

    // Utilisateur qui a passé la commande
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required'],
        index: true,
    },

    // Articles commandés (snapshot au moment de la commande)
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        // Snapshot des infos produit au moment de la commande
        productSnapshot: {
            title: String,
            price: Number,
            images: [{
                url: String,
                thumbnail: String,
            }],
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, 'Quantity must be at least 1'],
        },
        price: {
            type: Number,
            required: true,
        },
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    }],

    // Adresse de livraison
    shippingAddress: {
        fullName: {
            type: String,
            required: [true, 'Full name is required'],
            trim: true,
        },
        phone: {
            type: String,
            required: [true, 'Phone is required'],
            trim: true,
        },
        address: {
            type: String,
            required: [true, 'Address is required'],
            trim: true,
        },
        city: {
            type: String,
            required: [true, 'City is required'],
            trim: true,
        },
        postalCode: {
            type: String,
            required: [true, 'Postal code is required'],
            trim: true,
        },
        country: {
            type: String,
            required: [true, 'Country is required'],
            trim: true,
            default: 'Morocco',
        },
    },

    // Coupon appliqué (si applicable)
    coupon: {
        code: String,
        discountType: {
            type: String,
            enum: ['percentage', 'fixed', 'free_shipping'],
        },
        discountValue: Number,
        discountAmount: {
            type: Number,
            default: 0,
        },
    },

    // Montants
    pricing: {
        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },
        discount: {
            type: Number,
            default: 0,
            min: 0,
        },
        shippingCost: {
            type: Number,
            default: 0,
            min: 0,
        },
        tax: {
            type: Number,
            default: 0,
            min: 0,
        },
        total: {
            type: Number,
            required: true,
            min: 0,
        },
    },

    // Statut de la commande
    status: {
        type: String,
        enum: {
            values: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
            message: '{VALUE} is not a valid status'
        },
        default: 'pending',
        index: true,
    },

    // Historique des changements de statut
    statusHistory: [{
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
        },
        comment: String,
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    }],

    // Méthode de paiement
    paymentMethod: {
        type: String,
        enum: {
            values: ['cash_on_delivery', 'card', 'paypal'],
            message: '{VALUE} is not a valid payment method'
        },
        default: 'cash_on_delivery',
    },

    // Statut du paiement
    paymentStatus: {
        type: String,
        enum: {
            values: ['pending', 'paid', 'failed', 'refunded'],
            message: '{VALUE} is not a valid payment status'
        },
        default: 'pending',
        index: true,
    },

    // Informations de paiement (si applicable)
    paymentInfo: {
        paymentIntentId: String, // Stripe Payment Intent ID
        transactionId: String,
        paidAt: Date,
    },

    // Notes de la commande
    notes: {
        type: String,
        maxlength: [500, 'Notes cannot exceed 500 characters'],
    },

    // Dates importantes
    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,

    // Raison d'annulation
    cancellationReason: {
        type: String,
        maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
    },

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

// Index composés pour performance
orderSchema.index({ user: 1, status: 1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ 'items.seller': 1, status: 1 });
orderSchema.index({ deleted: 1, status: 1 });

/**
 * Hook pre-save pour générer le numéro de commande
 */
orderSchema.pre('save', async function (next) {
    if (this.isNew && !this.orderNumber) {
        // Format: ORD-YYYYMMDD-XXXXX
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

        // Compter les commandes du jour
        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(date.setHours(0, 0, 0, 0)),
                $lt: new Date(date.setHours(23, 59, 59, 999)),
            },
        });

        const orderNum = String(count + 1).padStart(5, '0');
        this.orderNumber = `ORD-${dateStr}-${orderNum}`;
    }

    next();
});

/**
 * Hook pre-save pour ajouter l'historique de statut
 */
orderSchema.pre('save', function (next) {
    if (this.isModified('status')) {
        this.statusHistory.push({
            status: this.status,
            updatedAt: new Date(),
        });

        // Mettre à jour les dates selon le statut
        switch (this.status) {
            case 'confirmed':
                this.confirmedAt = new Date();
                break;
            case 'shipped':
                this.shippedAt = new Date();
                break;
            case 'delivered':
                this.deliveredAt = new Date();
                break;
            case 'cancelled':
                this.cancelledAt = new Date();
                break;
        }
    }

    next();
});

/**
 * Méthode pour calculer les totaux (avec coupon si applicable)
 */
orderSchema.methods.calculateTotals = function () {
    // Calculer le subtotal
    const subtotal = this.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
    }, 0);

    // Calculer la réduction du coupon
    let discount = 0;
    let shippingCost = subtotal >= 500 ? 0 : 50;

    if (this.coupon && this.coupon.code) {
        discount = this.coupon.discountAmount || 0;

        // Si livraison gratuite
        if (this.coupon.discountType === 'free_shipping') {
            shippingCost = 0;
        }
    }

    // Calculer la taxe (20%) sur le montant après réduction
    const taxableAmount = subtotal - discount;
    const tax = taxableAmount * 0.20;

    // Total
    const total = subtotal - discount + tax + shippingCost;

    this.pricing = {
        subtotal,
        discount,
        tax,
        shippingCost,
        total: Math.max(0, total), // Éviter les totaux négatifs
    };
};

/**
 * Méthode pour soft delete
 */
orderSchema.methods.softDelete = function () {
    this.deleted = true;
    this.deletedAt = new Date();
    return this.save();
};

/**
 * Méthode pour restaurer
 */
orderSchema.methods.restore = function () {
    this.deleted = false;
    this.deletedAt = undefined;
    return this.save();
};

/**
 * Query helper pour filtrer les commandes actives
 */
orderSchema.query.active = function () {
    return this.where({ deleted: false });
};

/**
 * Méthode pour vérifier si la commande peut être annulée
 */
orderSchema.methods.canBeCancelled = function () {
    const cancellableStatuses = ['pending', 'confirmed'];
    return cancellableStatuses.includes(this.status);
};

/**
 * Méthode pour vérifier si le statut peut être mis à jour
 */
orderSchema.methods.canUpdateStatus = function (newStatus) {
    const statusFlow = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['processing', 'cancelled'],
        processing: ['shipped', 'cancelled'],
        shipped: ['delivered'],
        delivered: [],
        cancelled: [],
    };

    return statusFlow[this.status]?.includes(newStatus) || false;
};

module.exports = mongoose.model('Order', orderSchema);
