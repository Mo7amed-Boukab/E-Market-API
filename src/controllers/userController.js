const User = require('../models/user');
const ApiError = require('../utils/ApiError');

class UserController {
  /**
   * Obtenir tous les utilisateurs (Admin uniquement)
   */
  async getAllUsers(req, res, next) {
    try {
      const { page = 1, limit = 20, includeDeleted = false } = req.query;

      // Construire le filtre
      let filter = {};

      // Par défaut, exclure les utilisateurs supprimés
      if (includeDeleted !== 'true') {
        filter.deleted = false;
      }

      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const users = await User.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort('-createdAt');

      const total = await User.countDocuments(filter);

      res.status(200).json({
        count: users.length,
        total,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
        users,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir un utilisateur par ID (Admin uniquement)
   */
  async getUserById(req, res, next) {
    try {
      const { id } = req.params;

      const user = await User.findOne({
        _id: id,
        deleted: false
      });

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Supprimer un utilisateur (Admin uniquement)
   * Soft delete pour conformité RGPD
   */
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;

      const user = await User.findOne({
        _id: id,
        deleted: false
      });

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Soft delete
      await user.softDelete();

      res.status(200).json({
        message: 'User deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Restaurer un utilisateur supprimé (Admin uniquement)
   */
  async restoreUser(req, res, next) {
    try {
      const { id } = req.params;

      const user = await User.findOne({
        _id: id,
        deleted: true
      });

      if (!user) {
        throw ApiError.notFound('Deleted user not found');
      }

      await user.restore();

      res.status(200).json({
        message: 'User restored successfully',
        user,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();