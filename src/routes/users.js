const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { userIdValidator } = require('../validators/userValidator');

/**
 * Routes des utilisateurs
 * Toutes les routes nécessitent une authentification et le rôle admin
 */

// Toutes les routes users nécessitent admin
router.use(authenticate);
router.use(authorize('admin'));

// GET /api/v1/users - Récupérer tous les utilisateurs (admin only)
router.get('/', userController.getAllUsers);

// GET /api/v1/users/:id - Récupérer un utilisateur par ID (admin only)
router.get('/:id', userIdValidator, userController.getUserById);

// DELETE /api/v1/users/:id - Supprimer un utilisateur (admin only)
router.delete('/:id', userIdValidator, userController.deleteUser);

// PATCH /api/v1/users/:id/restore - Restaurer un utilisateur (admin only)
router.patch('/:id/restore', userIdValidator, userController.restoreUser);

module.exports = router;