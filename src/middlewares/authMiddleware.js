const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/jwt');
const TokenBlacklist = require('../models/tokenBlacklist');

/**
 * Middleware d'authentification
 * Vérifie la présence et la validité du token JWT + blacklist
 */
const authenticate = async (req, res, next) => {
    try {
        // Récupérer le token depuis le header Authorization
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw ApiError.unauthorized('No token provided. Please login.');
        }

        // Extraire le token
        const token = authHeader.split(' ')[1];

        // Vérifier et décoder le token
        const decoded = verifyToken(token);

        // Vérifier si le token est blacklisté
        const isBlacklisted = await TokenBlacklist.isBlacklisted(token);
        if (isBlacklisted) {
            throw ApiError.unauthorized('Token has been revoked. Please login again.');
        }

        // Ajouter le token et les informations de l'utilisateur à la requête
        req.token = token;
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
        };

        next();
    } catch (error) {
        if (error.message === 'Token expired') {
            return next(ApiError.unauthorized('Token expired. Please login again.'));
        }
        if (error.message === 'Invalid token') {
            return next(ApiError.unauthorized('Invalid token. Please login again.'));
        }
        if (error.message === 'Token has been revoked. Please login again.') {
            return next(error);
        }
        next(error);
    }
};

/**
 * Middleware pour vérifier le rôle de l'utilisateur
 * @param {...String} roles - Les rôles autorisés
 * @returns {Function} Middleware function
 * 
 * @example
 * router.get('/admin', authenticate, authorize('admin'), controller.method);
 * router.get('/users', authenticate, authorize('admin', 'user'), controller.method);
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(ApiError.unauthorized('Authentication required.'));
        }

        if (!roles.includes(req.user.role)) {
            return next(ApiError.forbidden('You do not have permission to access this resource.'));
        }

        next();
    };
};

module.exports = {
    authenticate,
    authorize,
};
