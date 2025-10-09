const Product = require('../models/product');
const Category = require('../models/category');
const mongoose = require('mongoose');

class ProductController {

  async createProduct(req, res) {
    try {
      const { title, description, price, stock, category, imageUrl } = req.body;

      if (!title || !description || !price || !stock || !category) {
        return res.status(400).json({ message: 'All required fields must be provided.' });
      }

      const categoryExist = await Category.findOne({ name: category });
      if (!categoryExist) {
        return res.status(404).json({ message: 'Category not found.' });
      }

      const newProduct = new Product({
        title: title.trim(),
        description: description.trim(),
        price,
        stock,
        category: category.trim(),
        imageUrl: imageUrl || null,
      });

      await newProduct.save();

      return res.status(201).json({
        message: 'Product created successfully.',
        product: newProduct,
      });

    } catch (error) {
      console.error('Error creating product:', error);
      return res.status(500).json({ message: 'Server error while creating product.', error: error.message  });
    }
  }

  async getAllProducts(req, res) {
     try {
       const products = await Product.find({ deleted: false });

       if (!products || products.length === 0) {
         return res.status(404).json({ message: "No products found." });
       }

       return res.status(200).json(products);

     } catch (error) {
       console.error("Error retrieving products:", error);
       return res.status(500).json({message: "Server error while retrieving products.", error: error.message });
     }
   }


  async getProductById(req, res) {
      try {
        const { id } = req.params; 

        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ message: 'Invalid product ID format.' });
        }

        const product = await Product.findById(id);
        if (!product || product.deleted) {
          return res.status(404).json({ message: 'Product not found.' });
        }
        return res.status(200).json(product);

      } catch (error) {
        console.error('Error retrieving product:', error);
        return res.status(500).json({ message: 'Server error while retrieving product.', error: error.message });
      }
   }

   async updateProduct(req, res) {
     try {
       const { id } = req.params;
       const { title, description, price, stock, category, imageUrl } = req.body;

       if (!mongoose.Types.ObjectId.isValid(id)) {
         return res.status(400).json({ message: 'Invalid product ID format.' });
       }

       const product = await Product.findById(id);
       if (!product || product.deleted) {
         return res.status(404).json({ message: 'Product not found.' });
       }

       if (category) {
         const categoryExist = await Category.findOne({ name: category });

         if (!categoryExist) {
           return res.status(404).json({ message: 'Category not found.' });
         }
         product.category = category.trim();
       }

       if (title) product.title = title.trim();
       if (description) product.description = description.trim();
       if (price !== undefined) product.price = price;
       if (stock !== undefined) product.stock = stock;
       if (imageUrl !== undefined) product.imageUrl = imageUrl;

       await product.save();

       return res.status(200).json({ message: 'Product updated successfully.', product });

     } catch (error) {
       console.error('Error updating product:', error);
       return res.status(500).json({ message: 'Server error while updating product.', error: error.message });
     } 
   }

   async deleteProduct(req, res) {
      try {
        const { id } = req.params; 
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ message: 'Invalid product ID format.' });
        }
        const product = await Product.findById(id);
        if (!product || product.deleted) {
          return res.status(404).json({ message: 'Product not found.' });
        } 
        product.deleted = true;
        await product.save();

        return res.status(200).json({ message: 'Product deleted successfully.' });

      } catch (error) {
        console.error('Error deleting product:', error);
        return res.status(500).json({ message: 'Server error while deleting product.', error: error.message });
      }
    }
}

module.exports = new ProductController();
