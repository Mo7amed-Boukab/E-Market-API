const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  title: {type: String, required: true, min: 3},
  description: {type: String, required: true, min: 8},

  price: {type: Number, required: true},
  stock: {type: Number, required: true, default: 0},
  
  category: {type: String, required: true},
  imageUrl: {type: String},
  
  createdAt: { type: Date, default: Date.now },
  deleted: { type: Boolean, default: false }
});

module.exports = mongoose.model('Product', ProductSchema);
