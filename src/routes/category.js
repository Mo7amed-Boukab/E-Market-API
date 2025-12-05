const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const {
    createCategoryValidator,
    updateCategoryValidator,
    categoryIdValidator,
} = require('../validators/categoryValidator');

/**
 * Routes des catégories
 * - GET : Public
 * - POST, PUT, DELETE : Admin uniquement
 */

// GET /api/v1/categories - Liste des catégories (Public)
router.get(
    '/',
    categoryController.getAllCategories
);

// GET /api/v1/categories/:id - Détails d'une catégorie (Public)
router.get(
    '/:id',
    categoryIdValidator,
    categoryController.getCategoryById
);

// POST /api/v1/categories - Créer une catégorie (Admin)
router.post(
    '/',
    authenticate,
    authorize('admin'),
    createCategoryValidator,
    categoryController.createCategory
);

// PUT /api/v1/categories/:id - Mettre à jour une catégorie (Admin)
router.put(
    '/:id',
    authenticate,
    authorize('admin'),
    updateCategoryValidator,
    categoryController.updateCategory
);

// DELETE /api/v1/categories/:id - Supprimer une catégorie (Admin)
router.delete(
    '/:id',
    authenticate,
    authorize('admin'),
    categoryIdValidator,
    categoryController.deleteCategory
);

// PATCH /api/v1/categories/:id/restore - Restaurer une catégorie (Admin)
router.patch(
    '/:id/restore',
    authenticate,
    authorize('admin'),
    categoryIdValidator,
    categoryController.restoreCategory
);

module.exports = router;