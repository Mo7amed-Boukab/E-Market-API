const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({

  fullname: {type: String, required: true, min: 3},
  email: {type: String, required: true, unique: true, email: true},
  password: {type: String, required: true, min: 8},

  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt : { type: Date, default: Date.now },
  deleted : { type: Boolean, default: false }
});

module.exports = mongoose.model('User', userSchema);
