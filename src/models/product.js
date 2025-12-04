const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Informations de base
  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
    index: true, // Index pour recherche
  },

  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [5000, 'Description cannot exceed 5000 characters'],
  },

  // Prix et stock
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    validate: {
      validator: function (value) {
        return value >= 0;
      },
      message: 'Price must be a positive number'
    }
  },

  originalPrice: {
    type: Number,
    min: [0, 'Original price cannot be negative'],
    validate: {
      validator: function (value) {
        // Si originalPrice est défini, il doit être >= price
        if (value && this.price) {
          return value >= this.price;
        }
        return true;
      },
      message: 'Original price must be greater than or equal to current price'
    }
  },

  stock: {
    type: Number,
    required: [true, 'Stock is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0,
  },

  // Catégories (array pour multi-catégories)
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  }],

  // Images (array pour plusieurs images)
  images: [{
    url: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String, // URL de la miniature optimisée
    },
    alt: {
      type: String,
      default: '',
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    }
  }],

  // Seller (propriétaire du produit)
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seller is required'],
    index: true, // Index pour filtrer par seller
  },

  // Status du produit
  status: {
    type: String,
    enum: {
      values: ['draft', 'published'],
      message: '{VALUE} is not a valid status'
    },
    default: 'published', // Par défaut publié
    index: true,
  },

  // Visibilité
  visibility: {
    type: String,
    enum: {
      values: ['public', 'private'],
      message: '{VALUE} is not a valid visibility'
    },
    default: 'public',
    index: true,
  },

  // Métadonnées SEO 
  seo: {
    metaTitle: {
      type: String,
      maxlength: 60,
    },
    metaDescription: {
      type: String,
      maxlength: 160,
    },
    keywords: [{
      type: String,
    }],
  },

  // Statistiques (pour analytics)
  stats: {
    views: {
      type: Number,
      default: 0,
    },
    sales: {
      type: Number,
      default: 0,
    },
  },

  // Soft delete
  deleted: {
    type: Boolean,
    default: false,
    index: true,
  },

  deletedAt: {
    type: Date,
  },

}, {
  timestamps: true, // createdAt et updatedAt automatiques
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Index composés pour performance
productSchema.index({ seller: 1, status: 1 });
productSchema.index({ status: 1, visibility: 1, deleted: 1 });
productSchema.index({ categories: 1, status: 1 });
productSchema.index({ title: 'text', description: 'text' }); // Recherche full-text

// Virtual pour l'image principale
productSchema.virtual('primaryImage').get(function () {
  const primary = this.images.find(img => img.isPrimary);
  return primary || this.images[0] || null;
});

// Virtual pour vérifier la disponibilité
productSchema.virtual('isAvailable').get(function () {
  return this.stock > 0 && this.status === 'published' && !this.deleted;
});

// Virtual pour calculer le pourcentage de réduction
productSchema.virtual('discountPercentage').get(function () {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
});

// Méthode pour soft delete
productSchema.methods.softDelete = function () {
  this.deleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Méthode pour restaurer
productSchema.methods.restore = function () {
  this.deleted = false;
  this.deletedAt = undefined;
  return this.save();
};

// Méthode pour publier/dépublier
productSchema.methods.publish = function () {
  this.status = 'published';
  return this.save();
};

productSchema.methods.unpublish = function () {
  this.status = 'draft';
  return this.save();
};

// Méthode pour définir l'image principale
productSchema.methods.setPrimaryImage = function (imageIndex) {
  if (imageIndex >= 0 && imageIndex < this.images.length) {
    this.images.forEach((img, idx) => {
      img.isPrimary = idx === imageIndex;
    });
    return this.save();
  }
  throw new Error('Invalid image index');
};

// Hook pre-save pour validation
productSchema.pre('save', function (next) {
  // S'assurer qu'il y a au moins une catégorie
  if (this.categories.length === 0) {
    return next(new Error('Product must have at least one category'));
  }

  // S'assurer qu'il y a au moins une image principale si des images existent
  if (this.images.length > 0) {
    const hasPrimary = this.images.some(img => img.isPrimary);
    if (!hasPrimary) {
      this.images[0].isPrimary = true;
    }
  }

  next();
});

// Query helpers pour filtrer facilement
productSchema.query.published = function () {
  return this.where({ status: 'published', deleted: false });
};

productSchema.query.bySeller = function (sellerId) {
  return this.where({ seller: sellerId });
};

productSchema.query.inStock = function () {
  return this.where('stock').gt(0);
};

module.exports = mongoose.model('Product', productSchema);
