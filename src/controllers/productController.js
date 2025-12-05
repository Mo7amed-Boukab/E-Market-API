const Product = require('../models/product');
const Category = require('../models/category');
const ApiError = require('../utils/ApiError');
const imageService = require('../services/imageService');
const viewService = require('../services/viewService');

class ProductController {
  /**
   * Créer un nouveau produit (Seller/Admin)
   */
  async createProduct(req, res, next) {
    try {
      const { title, description, price, originalPrice, stock, categories, status, visibility, seo } = req.body;
      const sellerId = req.user.userId;

      // Vérifier que les catégories existent et ne sont pas supprimées
      const existingCategories = await Category.find({
        _id: { $in: categories },
        deleted: false
      });
      if (existingCategories.length !== categories.length) {
        throw ApiError.badRequest('One or more categories do not exist or are deleted');
      }

      // Traiter les images uploadées
      let images = [];
      if (req.files && req.files.length > 0) {
        const optimizedImages = await imageService.optimizeMultipleImages(req.files);

        images = optimizedImages
          .filter(img => img.success)
          .map((img, index) => ({
            url: imageService.getImageUrl(img.optimized || img.webp),
            thumbnail: img.thumbnail ? imageService.getImageUrl(img.thumbnail) : null,
            alt: title,
            isPrimary: index === 0, // La première image est principale par défaut
          }));
      }

      // Créer le produit
      const product = new Product({
        title,
        description,
        price,
        originalPrice,
        stock,
        categories,
        images,
        seller: sellerId,
        status: status || 'published', // Par défaut published
        visibility: visibility || 'public',
        seo: seo || {},
      });

      await product.save();

      // Peupler les catégories et le seller pour la réponse
      await product.populate('categories seller', 'name fullname email');

      res.status(201).json({
        message: 'Product created successfully',
        product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Récupérer tous les produits (avec filtres)
   */
  async getAllProducts(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        category,
        seller,
        minPrice,
        maxPrice,
        inStock,
        search,
        sort = '-createdAt',
      } = req.query;

      // Construction du filtre
      const filter = { deleted: false };

      // Filtres selon le rôle
      if (req.user && req.user.role === 'seller') {
        // Un seller ne voit que ses produits
        filter.seller = req.user.userId;
      } else if (!req.user || req.user.role === 'user') {
        // Les users ne voient que les produits publiés et publics
        filter.status = 'published';
        filter.visibility = 'public';
      }
      // Les admins voient tout

      // Filtres additionnels
      if (status) filter.status = status;
      if (category) filter.categories = category;
      if (seller) filter.seller = seller;
      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
      }
      if (inStock === 'true') filter.stock = { $gt: 0 };

      // Recherche full-text
      if (search) {
        filter.$text = { $search: search };
      }

      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Requête
      const products = await Product.find(filter)
        .populate('categories', 'name')
        .populate('seller', 'fullname email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Product.countDocuments(filter);

      res.status(200).json({
        products,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Récupérer un produit par ID
   */
  async getProductById(req, res, next) {
    try {
      const { id } = req.params;

      const product = await Product.findOne({ _id: id, deleted: false })
        .populate('categories', 'name')
        .populate('seller', 'fullname email role');

      if (!product) {
        throw ApiError.notFound('Product not found');
      }

      // Vérifier les permissions
      if (product.status === 'draft' || product.visibility === 'private') {
        // Seul le seller ou un admin peut voir un produit draft/private
        if (!req.user || (req.user.role !== 'admin' && product.seller._id.toString() !== req.user.userId)) {
          throw ApiError.forbidden('You do not have permission to view this product');
        }
      }

      // Incrémenter les vues de manière professionnelle (avec protection anti-spam)
      await viewService.incrementView(product._id, req);

      res.status(200).json({ product });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mettre à jour un produit (Seller propriétaire UNIQUEMENT)
   */
  async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = req.user.userId;

      // Trouver le produit
      const product = await Product.findOne({ _id: id, deleted: false });

      if (!product) {
        throw ApiError.notFound('Product not found');
      }

      // Vérifier les permissions : SEUL le propriétaire peut modifier le contenu
      if (product.seller.toString() !== userId) {
        throw ApiError.forbidden('You can only update your own products.');
      }

      // Vérifier les catégories si elles sont mises à jour
      if (updates.categories) {
        const existingCategories = await Category.find({
          _id: { $in: updates.categories },
          deleted: false
        });
        if (existingCategories.length !== updates.categories.length) {
          throw ApiError.badRequest('One or more categories do not exist or are deleted');
        }
      }

      // Traiter les nouvelles images si uploadées
      if (req.files && req.files.length > 0) {
        const optimizedImages = await imageService.optimizeMultipleImages(req.files);

        const newImages = optimizedImages
          .filter(img => img.success)
          .map(img => ({
            url: imageService.getImageUrl(img.optimized || img.webp),
            thumbnail: img.thumbnail ? imageService.getImageUrl(img.thumbnail) : null,
            alt: updates.title || product.title,
            isPrimary: false,
          }));

        // Ajouter les nouvelles images aux existantes
        product.images.push(...newImages);
      }

      // Mettre à jour les champs
      Object.keys(updates).forEach(key => {
        if (key !== 'seller' && key !== 'images') { // Ne pas permettre de changer le seller
          product[key] = updates[key];
        }
      });

      await product.save();
      await product.populate('categories seller', 'name fullname email');

      res.status(200).json({
        message: 'Product updated successfully',
        product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Supprimer un produit (soft delete)
   * Admin : Modération
   * Seller : Gestion de ses produits
   */
  async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;

      const product = await Product.findOne({ _id: id, deleted: false });

      if (!product) {
        throw ApiError.notFound('Product not found');
      }

      // Vérifier les permissions
      if (userRole !== 'admin' && product.seller.toString() !== userId) {
        throw ApiError.forbidden('You can only delete your own products');
      }

      // Soft delete
      await product.softDelete();

      res.status(200).json({
        message: 'Product deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Changer le status d'un produit
   * Seller : draft <-> published
   * Admin : published -> draft (Modération : retirer un produit)
   */
  async changeStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.userId;
      const userRole = req.user.role;

      const product = await Product.findOne({ _id: id, deleted: false });

      if (!product) {
        throw ApiError.notFound('Product not found');
      }

      // Logique de permission stricte
      if (userRole === 'admin') {
        // L'admin ne peut que DÉPUBLIER (mettre en draft) pour modération
        if (status === 'published' && product.status === 'draft') {
          throw ApiError.forbidden('Admins cannot publish products on behalf of sellers.');
        }
      } else {
        // Le seller doit être propriétaire
        if (product.seller.toString() !== userId) {
          throw ApiError.forbidden('You can only change status of your own products');
        }
      }

      product.status = status;
      await product.save();

      res.status(200).json({
        message: `Product status changed to ${status}`,
        product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Définir l'image principale
   */
  async setPrimaryImage(req, res, next) {
    try {
      const { id } = req.params;
      const { imageIndex } = req.body;
      const userId = req.user.userId;
      const userRole = req.user.role;

      const product = await Product.findOne({ _id: id, deleted: false });

      if (!product) {
        throw ApiError.notFound('Product not found');
      }

      // Vérifier les permissions
      if (userRole !== 'admin' && product.seller.toString() !== userId) {
        throw ApiError.forbidden('You can only modify your own products');
      }

      await product.setPrimaryImage(imageIndex);

      res.status(200).json({
        message: 'Primary image set successfully',
        product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Supprimer une image spécifique
   */
  async deleteImage(req, res, next) {
    try {
      const { id, imageIndex } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;

      const product = await Product.findOne({ _id: id, deleted: false });

      if (!product) {
        throw ApiError.notFound('Product not found');
      }

      // Vérifier les permissions
      if (userRole !== 'admin' && product.seller.toString() !== userId) {
        throw ApiError.forbidden('You can only modify your own products');
      }

      const index = parseInt(imageIndex);
      if (index < 0 || index >= product.images.length) {
        throw ApiError.badRequest('Invalid image index');
      }

      // Supprimer l'image du système de fichiers
      const image = product.images[index];
      await imageService.deleteImage(image.url);

      // Retirer l'image du tableau
      product.images.splice(index, 1);

      // Si c'était l'image principale, définir la première comme principale
      if (product.images.length > 0 && !product.images.some(img => img.isPrimary)) {
        product.images[0].isPrimary = true;
      }

      await product.save();

      res.status(200).json({
        message: 'Image deleted successfully',
        product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir les produits les plus vus
   */
  async getMostViewedProducts(req, res, next) {
    try {
      const { limit = 10, period = 'all' } = req.query;

      // Valider la période
      const validPeriods = ['today', 'week', 'month', 'all'];
      if (!validPeriods.includes(period)) {
        throw ApiError.badRequest('Invalid period. Must be: today, week, month, or all');
      }

      const products = await viewService.getMostViewedProducts(parseInt(limit), period);

      res.status(200).json({
        period,
        limit: parseInt(limit),
        products,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir les statistiques de vues d'un produit (Seller/Admin)
   */
  async getProductViewStats(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;

      const product = await Product.findOne({ _id: id, deleted: false });

      if (!product) {
        throw ApiError.notFound('Product not found');
      }

      // Vérifier les permissions (seller propriétaire ou admin)
      if (userRole !== 'admin' && product.seller.toString() !== userId) {
        throw ApiError.forbidden('You can only view statistics of your own products');
      }

      const stats = await viewService.getViewStatistics(id);

      res.status(200).json({
        productId: id,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();
