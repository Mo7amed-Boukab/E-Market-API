const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {type: String, required: true, min: 3},
  createdAt: { type: Date, default: Date.now },
  deleted: { type: Boolean, default: false }
});

module.exports = mongoose.model('Category', CategorySchema);
