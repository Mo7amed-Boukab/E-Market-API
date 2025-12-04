const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { upload, handleMulterError } = require('../config/multer');
const {
    createProductValidator,
    updateProductValidator,
    productIdValidator,
    changeStatusValidator,
    setPrimaryImageValidator,
} = require('../validators/productValidator');

/**
 * Routes publiques (sans authentification)
 */

// GET /api/v1/products - Liste des produits publics
router.get('/', productController.getAllProducts);

// GET /api/v1/products/:id - Détails d'un produit
router.get('/:id', productIdValidator, productController.getProductById);

/**
 * Routes protégées (Seller/Admin)
 * Règles strictes :
 * - Création/Modification : Seller uniquement
 * - Modération (Delete/Status) : Seller (propriétaire) ou Admin
 */

// POST /api/v1/products - Créer un produit (Seller uniquement)
router.post(
    '/',
    authenticate,
    authorize('seller'),
    upload.array('images', 10), // Max 10 images
    handleMulterError,
    createProductValidator,
    productController.createProduct
);

// PUT /api/v1/products/:id - Mettre à jour un produit (Seller propriétaire uniquement)
router.put(
    '/:id',
    authenticate,
    authorize('seller'),
    upload.array('images', 10),
    handleMulterError,
    updateProductValidator,
    productController.updateProduct
);

// DELETE /api/v1/products/:id - Supprimer un produit (Seller propriétaire ou Admin pour modération)
router.delete(
    '/:id',
    authenticate,
    authorize('seller', 'admin'),
    productIdValidator,
    productController.deleteProduct
);

// PATCH /api/v1/products/:id/status - Changer le status (Seller: draft/published, Admin: modération)
router.patch(
    '/:id/status',
    authenticate,
    authorize('seller', 'admin'),
    changeStatusValidator,
    productController.changeStatus
);

// PATCH /api/v1/products/:id/primary-image - Définir l'image principale (Seller uniquement)
router.patch(
    '/:id/primary-image',
    authenticate,
    authorize('seller'),
    setPrimaryImageValidator,
    productController.setPrimaryImage
);

// DELETE /api/v1/products/:id/images/:imageIndex - Supprimer une image (Seller uniquement)
router.delete(
    '/:id/images/:imageIndex',
    authenticate,
    authorize('seller'),
    productController.deleteImage
);

module.exports = router;
