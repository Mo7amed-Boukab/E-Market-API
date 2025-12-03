const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate, authorize } = require("../middlewares/authMiddleware");

// Toutes les routes users nécessitent une authentification et le rôle admin
router.use(authenticate);
router.use(authorize('admin'));

// GET /api/v1/users - Récupérer tous les utilisateurs (admin only)
router.get("/", userController.getAllUsers);

// GET /api/v1/users/:id - Récupérer un utilisateur par ID (admin only)
router.get("/:id", userController.getUserById);

// DELETE /api/v1/users/:id - Supprimer un utilisateur (admin only)
router.delete("/:id", userController.deleteUser);

module.exports = router;