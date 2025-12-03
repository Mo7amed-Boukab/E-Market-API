const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  fullname: { type: String, required: true, minlength: 3 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false }, // select: false pour ne pas retourner le password par défaut
  role: { type: String, enum: ['user', 'seller', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
  deleted: { type: Boolean, default: false }
}, {
  timestamps: true // Ajoute automatiquement createdAt et updatedAt
});

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

// Méthode pour retourner l'utilisateur sans le mot de passe
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
