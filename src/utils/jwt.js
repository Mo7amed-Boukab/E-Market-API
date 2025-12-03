const jwt = require('jsonwebtoken');

/**
 * Génère un token JWT pour un utilisateur
 * @param {Object} payload - Les données à inclure dans le token (userId, email, role)
 * @param {String} expiresIn - Durée de validité du token (ex: '1h', '7d')
 * @returns {String} Token JWT
 */
const generateToken = (payload, expiresIn = '24h') => {
    const secret = process.env.JWT_SECRET;

    return jwt.sign(payload, secret, {expiresIn});
};

/**
 * Vérifie et décode un token JWT
 * @param {String} token - Le token à vérifier
 * @returns {Object} Payload décodé
 * @throws {Error} Si le token est invalide ou expiré
 */
const verifyToken = (token) => {
    const secret = process.env.JWT_SECRET;

    try {
        return jwt.verify(token, secret);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token expired');
        }
        if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        }
        throw error;
    }
};

/**
 * Génère un refresh token (durée plus longue)
 * @param {Object} payload - Les données à inclure dans le token
 * @returns {String} Refresh token JWT
 */
const generateRefreshToken = (payload) => {
    return generateToken(payload, '7d');
};

module.exports = {
    generateToken,
    verifyToken,
    generateRefreshToken,
};
