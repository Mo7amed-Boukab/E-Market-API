const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');
const {
    registerValidator,
    loginValidator,
    changePasswordValidator,
    refreshTokenValidator,
} = require('../validators/authValidator');
const { authLimiter, createAccountLimiter } = require('../middlewares/rateLimitMiddleware');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Inscription d'un nouvel utilisateur
 * @access  Public
 */
router.post('/register', createAccountLimiter, registerValidator, authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Connexion d'un utilisateur
 * @access  Public
 */
router.post('/login', authLimiter, loginValidator, authController.login);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Déconnexion d'un utilisateur (révoque le token)
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Récupérer le profil de l'utilisateur connecté
 * @access  Private
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Rafraîchir le token d'accès
 * @access  Private
 */
router.post('/refresh', authenticate, refreshTokenValidator, authController.refreshToken);

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Changer le mot de passe
 * @access  Private
 */
router.put('/change-password', authenticate, changePasswordValidator, authController.changePassword);

module.exports = router;
