const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [3, 'Full name must be at least 3 characters'],
    maxlength: [100, 'Full name cannot exceed 100 characters'],
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },

  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false, // Ne pas retourner le password par défaut
  },

  role: {
    type: String,
    enum: {
      values: ['user', 'seller', 'admin'],
      message: '{VALUE} is not a valid role'
    },
    default: 'user',
    index: true,
  },

  // Stripe Connect (pour les sellers)
  stripeAccountId: {
    type: String,
    index: true,
  },

  // Soft delete
  deleted: {
    type: Boolean,
    default: false,
    index: true,
  },

  deletedAt: {
    type: Date
  },

}, {
  timestamps: true, // Ajoute automatiquement createdAt et updatedAt
});

// Index composé pour filtrage
userSchema.index({ deleted: 1, email: 1 });

// Hash le mot de passe avant de sauvegarder
userSchema.pre('save', async function (next) {
  // Ne hash que si le mot de passe a été modifié
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Méthode pour soft delete
userSchema.methods.softDelete = function () {
  this.deleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Méthode pour restaurer
userSchema.methods.restore = function () {
  this.deleted = false;
  this.deletedAt = undefined;
  return this.save();
};

// Query helper pour filtrer les utilisateurs actifs
userSchema.query.active = function () {
  return this.where({ deleted: false });
};

// Méthode pour retourner l'utilisateur sans le mot de passe
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
