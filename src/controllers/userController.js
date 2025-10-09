const User = require('../models/user');
const mongoose = require('mongoose');

class UserController {
  async createUser(req, res) {
    try {
      const { fullname, email, password, role } = req.body;

      if (!fullname || !email || !password) {
        return res.status(400).json({ message: 'Fullname, email, and password are required.' });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'This email is already in use.' });
      }

      const newUser = new User({
        fullname,
        email,
        password,
        role: role || 'user',
      });

      await newUser.save();

      res.status(201).json({
        message: 'User created successfully.',
        user: newUser,
      });
    } catch (error) {
      console.error('Error creating user:', error.message);
      res.status(500).json({ message: 'Server error while creating user.' });
    }
  }

  async getAllUsers(req, res) {
    try {
      const users = await User.find();
      if (users.length === 0) {
        return res.status(404).json({ message: 'No users found.' });
      }
      res.status(200).json(users);
    } catch (error) {
      console.error('Error retrieving users:', error.message);
      res.status(500).json({ message: 'Server error while retrieving users.' });
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid user ID format.' });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      res.status(200).json(user);
    } catch (error) {
      console.error('Error retrieving user:', error.message);
      res.status(500).json({ message: 'Server error while retrieving user.' });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid user ID format.' });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
      
      user.deleted = true;
      await user.save();

      res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
      console.error('Error deleting user:', error.message);
      res.status(500).json({ message: 'Server error while deleting user.' });
    }
  }
  
}

module.exports = new UserController();