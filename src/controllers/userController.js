const User = require('../models/user');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

class UserController {
  async getAllUsers(req, res, next) {
    try {
      const users = await User.find();

      if (users.length === 0) {
        throw ApiError.notFound('No users found.');
      }

      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw ApiError.badRequest('Invalid user ID format.');
      }

      const user = await User.findById(id);
      if (!user) {
        throw ApiError.notFound('User not found.');
      }

      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw ApiError.badRequest('Invalid user ID format.');
      }

      const user = await User.findById(id);
      if (!user) {
        throw ApiError.notFound('User not found.');
      }

      user.deleted = true;
      await user.save();

      res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }

}

module.exports = new UserController();