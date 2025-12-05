const Category = require('../models/category');
const ApiError = require('../utils/ApiError');

class CategoryController {
  /**
   * Créer une catégorie (Admin uniquement)
   */
  async createCategory(req, res, next) {
    try {
      const { name, description } = req.body;

      // Vérifier si la catégorie existe déjà
      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        deleted: false
      });

      if (existingCategory) {
        throw ApiError.badRequest('Category already exists');
      }

      const category = new Category({ name, description });
      await category.save();

      res.status(201).json({
        message: 'Category created successfully',
        category,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir toutes les catégories (Public)
   */
  async getAllCategories(req, res, next) {
    try {
      const { includeDeleted = false } = req.query;

      let query = Category.find();

      // Par défaut, exclure les catégories supprimées
      if (includeDeleted !== 'true' || req.user?.role !== 'admin') {
        query = query.active();
      }

      const categories = await query.sort('name');

      res.status(200).json({
        count: categories.length,
        categories,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir une catégorie par ID
   */
  async getCategoryById(req, res, next) {
    try {
      const { id } = req.params;

      const category = await Category.findOne({
        _id: id,
        deleted: false
      });

      if (!category) {
        throw ApiError.notFound('Category not found');
      }

      res.status(200).json({ category });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mettre à jour une catégorie (Admin uniquement)
   */
  async updateCategory(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const category = await Category.findOne({
        _id: id,
        deleted: false
      });

      if (!category) {
        throw ApiError.notFound('Category not found');
      }

      // Vérifier si le nouveau nom existe déjà
      if (name && name !== category.name) {
        const existingCategory = await Category.findOne({
          name: { $regex: new RegExp(`^${name}$`, 'i') },
          _id: { $ne: id },
          deleted: false,
        });

        if (existingCategory) {
          throw ApiError.badRequest('Category name already exists');
        }

        category.name = name;
      }

      if (description !== undefined) {
        category.description = description;
      }

      await category.save();

      res.status(200).json({
        message: 'Category updated successfully',
        category,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Supprimer une catégorie (Admin uniquement)
   * Soft delete pour préserver l'intégrité des produits
   */
  async deleteCategory(req, res, next) {
    try {
      const { id } = req.params;

      const category = await Category.findOne({
        _id: id,
        deleted: false
      });

      if (!category) {
        throw ApiError.notFound('Category not found');
      }

      // Vérifier si des produits utilisent cette catégorie
      const Product = require('../models/product');
      const productsCount = await Product.countDocuments({
        categories: id,
        deleted: false,
      });

      if (productsCount > 0) {
        throw ApiError.badRequest(
          `Cannot delete category. ${productsCount} product(s) are using this category`
        );
      }

      // Soft delete
      await category.softDelete();

      res.status(200).json({
        message: 'Category deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Restaurer une catégorie supprimée (Admin uniquement)
   */
  async restoreCategory(req, res, next) {
    try {
      const { id } = req.params;

      const category = await Category.findOne({
        _id: id,
        deleted: true
      });

      if (!category) {
        throw ApiError.notFound('Deleted category not found');
      }

      await category.restore();

      res.status(200).json({
        message: 'Category restored successfully',
        category,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CategoryController();