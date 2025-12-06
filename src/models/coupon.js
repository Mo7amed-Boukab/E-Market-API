const mongoose = require('mongoose');

/**
 * Modèle Coupon professionnel
 * - Codes uniques et sécurisés
 * - Types multiples (pourcentage, montant fixe, livraison gratuite)
 * - Conditions d'application (montant min, produits, catégories, utilisateurs)
 * - Limites d'utilisation (globale, par utilisateur)
 * - Dates de validité
 * - Statistiques d'utilisation
 */
const couponSchema = new mongoose.Schema({
    // Code du coupon (unique, case-insensitive)
    code: {
        type: String,
        required: [true, 'Coupon code is required'],
        unique: true,
        uppercase: true,
        trim: true,
        minlength: [3, 'Code must be at least 3 characters'],
        maxlength: [20, 'Code cannot exceed 20 characters'],
        match: [/^[A-Z0-9-]+$/, 'Code can only contain letters, numbers and hyphens'],
        index: true,
    },

    // Description du coupon
    description: {
        type: String,
        trim: true,
        maxlength: [200, 'Description cannot exceed 200 characters'],
    },

    // Type de réduction
    discountType: {
        type: String,
        enum: {
            values: ['percentage', 'fixed', 'free_shipping'],
            message: '{VALUE} is not a valid discount type'
        },
        required: [true, 'Discount type is required'],
    },

    // Valeur de la réduction
    discountValue: {
        type: Number,
        required: [true, 'Discount value is required'],
        min: [0, 'Discount value must be positive'],
        validate: {
            validator: function (value) {
                // Si pourcentage, max 100%
                if (this.discountType === 'percentage' && value > 100) {
                    return false;
                }
                return true;
            },
            message: 'Percentage discount cannot exceed 100%'
        }
    },

    // Montant minimum de commande requis
    minOrderAmount: {
        type: Number,
        default: 0,
        min: [0, 'Minimum order amount must be positive'],
    },

    // Montant maximum de réduction (pour pourcentage)
    maxDiscountAmount: {
        type: Number,
        min: [0, 'Maximum discount amount must be positive'],
    },

    // Dates de validité
    startDate: {
        type: Date,
        required: [true, 'Start date is required'],
        index: true,
    },

    expiryDate: {
        type: Date,
        required: [true, 'Expiry date is required'],
        index: true,
        validate: {
            validator: function (value) {
                return value > this.startDate;
            },
            message: 'Expiry date must be after start date'
        }
    },

    // Limites d'utilisation
    usageLimit: {
        total: {
            type: Number,
            min: [1, 'Total usage limit must be at least 1'],
        },
        perUser: {
            type: Number,
            default: 1,
            min: [1, 'Per user limit must be at least 1'],
        },
    },

    // Compteurs d'utilisation
    usageCount: {
        total: {
            type: Number,
            default: 0,
            min: 0,
        },
        byUser: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            count: {
                type: Number,
                default: 0,
            },
            lastUsed: Date,
        }],
    },

    // Restrictions
    restrictions: {
        // Produits spécifiques
        products: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
        }],

        // Catégories spécifiques
        categories: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
        }],

        // Utilisateurs spécifiques (pour coupons personnalisés)
        users: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],

        // Exclure certains produits
        excludedProducts: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
        }],

        // Exclure certaines catégories
        excludedCategories: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
        }],
    },

    // Statut
    status: {
        type: String,
        enum: {
            values: ['active', 'inactive', 'expired'],
            message: '{VALUE} is not a valid status'
        },
        default: 'active',
        index: true,
    },

    // Créateur du coupon (admin ou seller)
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    // Si créé par un seller, applicable uniquement à ses produits
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
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
couponSchema.index({ code: 1, deleted: 0 });
couponSchema.index({ status: 1, deleted: 0 });
couponSchema.index({ startDate: 1, expiryDate: 1 });
couponSchema.index({ seller: 1, status: 1 });

/**
 * Hook pre-save pour mettre à jour le statut automatiquement
 */
couponSchema.pre('save', function (next) {
    const now = new Date();

    // Mettre à jour le statut selon les dates
    if (this.expiryDate < now) {
        this.status = 'expired';
    } else if (this.startDate > now) {
        this.status = 'inactive';
    } else if (this.status === 'inactive' && this.startDate <= now && this.expiryDate > now) {
        this.status = 'active';
    }

    next();
});

/**
 * Méthode pour vérifier si le coupon est valide
 */
couponSchema.methods.isValid = function () {
    const now = new Date();

    return (
        !this.deleted &&
        this.status === 'active' &&
        this.startDate <= now &&
        this.expiryDate > now &&
        (!this.usageLimit.total || this.usageCount.total < this.usageLimit.total)
    );
};

/**
 * Méthode pour vérifier si un utilisateur peut utiliser le coupon
 */
couponSchema.methods.canUserUse = function (userId) {
    // Vérifier si le coupon est valide
    if (!this.isValid()) {
        return { valid: false, reason: 'Coupon is not valid or has expired' };
    }

    // Vérifier si le coupon est restreint à certains utilisateurs
    if (this.restrictions.users.length > 0) {
        const isAllowed = this.restrictions.users.some(
            id => id.toString() === userId.toString()
        );
        if (!isAllowed) {
            return { valid: false, reason: 'This coupon is not available for your account' };
        }
    }

    // Vérifier la limite par utilisateur
    const userUsage = this.usageCount.byUser.find(
        u => u.user.toString() === userId.toString()
    );

    if (userUsage && userUsage.count >= this.usageLimit.perUser) {
        return { valid: false, reason: 'You have reached the usage limit for this coupon' };
    }

    return { valid: true };
};

/**
 * Méthode pour calculer la réduction
 */
couponSchema.methods.calculateDiscount = function (orderAmount, items = []) {
    let discount = 0;

    switch (this.discountType) {
        case 'percentage':
            discount = (orderAmount * this.discountValue) / 100;
            // Appliquer le maximum si défini
            if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
                discount = this.maxDiscountAmount;
            }
            break;

        case 'fixed':
            discount = this.discountValue;
            // Ne pas dépasser le montant de la commande
            if (discount > orderAmount) {
                discount = orderAmount;
            }
            break;

        case 'free_shipping':
            // La réduction sera appliquée sur les frais de livraison
            discount = 0; // Géré séparément dans le calcul de commande
            break;
    }

    return Math.round(discount * 100) / 100; // Arrondir à 2 décimales
};

/**
 * Méthode pour enregistrer l'utilisation
 */
couponSchema.methods.recordUsage = async function (userId) {
    // Incrémenter le compteur total
    this.usageCount.total += 1;

    // Mettre à jour le compteur par utilisateur
    const userUsageIndex = this.usageCount.byUser.findIndex(
        u => u.user.toString() === userId.toString()
    );

    if (userUsageIndex > -1) {
        this.usageCount.byUser[userUsageIndex].count += 1;
        this.usageCount.byUser[userUsageIndex].lastUsed = new Date();
    } else {
        this.usageCount.byUser.push({
            user: userId,
            count: 1,
            lastUsed: new Date(),
        });
    }

    return this.save();
};

/**
 * Méthode pour soft delete
 */
couponSchema.methods.softDelete = function () {
    this.deleted = true;
    this.deletedAt = new Date();
    this.status = 'inactive';
    return this.save();
};

/**
 * Méthode pour restaurer
 */
couponSchema.methods.restore = function () {
    this.deleted = false;
    this.deletedAt = undefined;
    // Le statut sera mis à jour par le hook pre-save
    return this.save();
};

/**
 * Query helper pour filtrer les coupons actifs
 */
couponSchema.query.active = function () {
    const now = new Date();
    return this.where({
        deleted: false,
        status: 'active',
        startDate: { $lte: now },
        expiryDate: { $gt: now },
    });
};

/**
 * Méthode statique pour générer un code aléatoire
 */
couponSchema.statics.generateCode = function (prefix = '', length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = prefix;

    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
};

module.exports = mongoose.model('Coupon', couponSchema);
