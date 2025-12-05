const mongoose = require('mongoose');

/**
 * Modèle Category 
 * - Validation stricte
 * - Soft delete
 * - Slug automatique
 * - Timestamps
 * - Index pour performance
 */
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    minlength: [3, 'Name must be at least 3 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
    unique: true,
    index: true,
  },

  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true,
  },

  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
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
  timestamps: true, // createdAt, updatedAt automatiques
});

// Index composé pour filtrage
categorySchema.index({ deleted: 1, name: 1 });

/**
 * Hook pre-save pour générer le slug automatiquement
 */
categorySchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

/**
 * Méthode pour soft delete
 */
categorySchema.methods.softDelete = function () {
  this.deleted = true;
  this.deletedAt = new Date();
  return this.save();
};

/**
 * Méthode pour restaurer
 */
categorySchema.methods.restore = function () {
  this.deleted = false;
  this.deletedAt = undefined;
  return this.save();
};

/**
 * Query helper pour filtrer les catégories non supprimées
 */
categorySchema.query.active = function () {
  return this.where({ deleted: false });
};

module.exports = mongoose.model('Category', categorySchema);
