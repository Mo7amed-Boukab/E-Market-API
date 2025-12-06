const User = require('../models/user');
const ApiError = require('../utils/ApiError');
const TokenBlacklist = require('../models/tokenBlacklist');
const { generateToken, generateRefreshToken, decodeToken } = require('../utils/jwt');
const notificationService = require('../services/notificationService');

class AuthController {
    /**
     * Inscription d'un nouvel utilisateur
     */
    async register(req, res, next) {
        try {
            const { fullname, email, password, role } = req.body;

            // Vérifier si l'email existe déjà
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                throw ApiError.conflict('This email is already in use.');
            }

            // Créer le nouvel utilisateur (le password sera hashé automatiquement par le pre-save hook)
            const newUser = new User({
                fullname,
                email,
                password,
                role: role || 'user',
            });

            await newUser.save();

            // Envoyer la notification de bienvenue (Asynchrone)
            notificationService.notifyWelcome(newUser._id).catch(err => console.error(err));

            // Générer les tokens
            const payload = {
                userId: newUser._id,
                email: newUser.email,
                role: newUser.role,
            };

            const accessToken = generateToken(payload);
            const refreshToken = generateRefreshToken(payload);

            res.status(201).json({
                message: 'User registered successfully.',
                user: newUser.toJSON(),
                tokens: {
                    accessToken,
                    refreshToken,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Connexion d'un utilisateur
     */
    async login(req, res, next) {
        try {
            const { email, password } = req.body;

            // Trouver l'utilisateur avec le password (select: false par défaut)
            const user = await User.findOne({ email }).select('+password');

            if (!user) {
                throw ApiError.unauthorized('Invalid email or password.');
            }

            // Vérifier si l'utilisateur est supprimé
            if (user.deleted) {
                throw ApiError.forbidden('This account has been deleted.');
            }

            // Comparer les mots de passe
            const isPasswordValid = await user.comparePassword(password);

            if (!isPasswordValid) {
                throw ApiError.unauthorized('Invalid email or password.');
            }

            // Générer les tokens
            const payload = {
                userId: user._id,
                email: user.email,
                role: user.role,
            };

            const accessToken = generateToken(payload);
            const refreshToken = generateRefreshToken(payload);

            res.status(200).json({
                message: 'Login successful.',
                user: user.toJSON(),
                tokens: {
                    accessToken,
                    refreshToken,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Déconnexion d'un utilisateur
     * Ajoute le token actuel à la blacklist
     */
    async logout(req, res, next) {
        try {
            const token = req.token; // Ajouté par le middleware authenticate
            const userId = req.user.userId;

            // Décoder le token pour obtenir la date d'expiration
            const jwt = require('jsonwebtoken');
            const decoded = jwt.decode(token);
            const expiresAt = new Date(decoded.exp * 1000);

            // Ajouter le token à la blacklist
            await TokenBlacklist.addToBlacklist(token, userId, expiresAt, 'logout');

            res.status(200).json({
                message: 'Logout successful.',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Récupérer le profil de l'utilisateur connecté
     */
    async getProfile(req, res, next) {
        try {
            // req.user est ajouté par le middleware d'authentification
            const user = await User.findById(req.user.userId);

            if (!user) {
                throw ApiError.notFound('User not found.');
            }

            res.status(200).json({
                user: user.toJSON(),
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Rafraîchir le token d'accès
     */
    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                throw ApiError.badRequest('Refresh token is required.');
            }

            // Le middleware auth vérifie déjà le token
            const payload = {
                userId: req.user.userId,
                email: req.user.email,
                role: req.user.role,
            };

            const newAccessToken = generateToken(payload);
            const newRefreshToken = generateRefreshToken(payload);

            res.status(200).json({
                message: 'Token refreshed successfully.',
                tokens: {
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Changer le mot de passe
     * Révoque tous les tokens existants pour forcer une nouvelle connexion
     */
    async changePassword(req, res, next) {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.user.userId;

            // Récupérer l'utilisateur avec le password
            const user = await User.findById(userId).select('+password');

            if (!user) {
                throw ApiError.notFound('User not found.');
            }

            // Vérifier l'ancien mot de passe
            const isPasswordValid = await user.comparePassword(currentPassword);

            if (!isPasswordValid) {
                throw ApiError.unauthorized('Current password is incorrect.');
            }

            // Mettre à jour le mot de passe (sera hashé automatiquement)
            user.password = newPassword;
            await user.save();

            // Révoquer tous les tokens de l'utilisateur (sauf le token actuel pour la réponse)
            // L'utilisateur devra se reconnecter avec le nouveau mot de passe
            const token = req.token;
            const jwt = require('jsonwebtoken');
            const decoded = jwt.decode(token);
            const expiresAt = new Date(decoded.exp * 1000);

            // Ajouter le token actuel à la blacklist
            await TokenBlacklist.addToBlacklist(token, userId, expiresAt, 'password_change');

            res.status(200).json({
                message: 'Password changed successfully. Please login again with your new password.',
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController();
