const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Rate Limiting Strategies
 * Protection contre les attaques DDoS, Brute Force et Spam.
 * 
 * NOTE SCALABILITÉ :
 * Actuellement, le stockage est en mémoire (MemoryStore).
 * Pour un déploiement multi-serveurs (Cluster/PM2), il FAUT utiliser un store externe comme Redis.
 * Voir : https://www.npmjs.com/package/rate-limit-redis
 */

// 1. Limiteur Global (Protection DDoS basique)
// Appliqué à toutes les routes API
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // ~66 requêtes/minute (Confortable pour un utilisateur actif)
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'error',
        message: 'Too many requests from this IP, please try again after 15 minutes'
    },
    handler: (req, res, next, options) => {
        logger.warn(`Global Rate Limit exceeded for IP: ${req.ip}`);
        res.status(options.statusCode).send(options.message);
    }
});

// 2. Limiteur Auth Strict (Login, Forgot Password)
// Protection contre le Brute Force
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: {
        status: 'error',
        message: 'Too many login attempts, please try again after 15 minutes'
    },
    handler: (req, res, next, options) => {
        logger.warn(`Auth Rate Limit exceeded for IP: ${req.ip}`);
        res.status(options.statusCode).send(options.message);
    }
});

// 3. Limiteur Création de Compte (Register)
// Protection contre le spam de comptes
const createAccountLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 5, // 5 comptes par heure par IP (Suffisant, personne ne crée 6 comptes légitimes)
    message: {
        status: 'error',
        message: 'Too many accounts created from this IP, please try again later'
    }
});

// 4. Limiteur API Standard (Produits, Commandes...)
// Pour éviter le scraping intensif
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // Augmenté pour correspondre à un usage intensif (Dashboard seller)
    message: {
        status: 'error',
        message: 'API rate limit exceeded'
    }
});

// 5. Limiteur d'Upload (Images) - CRITIQUE
// Protège le CPU (traitement Sharp) et le stockage
// 100 uploads/heure pour permettre aux vendeurs de gérer leur catalogue en masse
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 100,
    message: {
        status: 'error',
        message: 'Too many file uploads (limit: 100/hour), please try again later'
    }
});

// 6. Limiteur d'Avis (Reviews)
// Protège contre le spam d'avis et la manipulation de réputation
// 30 avis/heure pour permettre de noter plusieurs achats d'un coup
const reviewLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 30,
    message: {
        status: 'error',
        message: 'You are posting reviews too quickly'
    }
});

// 7. Limiteur de Commandes (Inventory Protection)
// Empêche de vider le stock avec de fausses commandes
// 20 commandes/heure (Large pour B2C, sécurisé contre les bots)
const orderLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 20,
    message: {
        status: 'error',
        message: 'Too many orders created, please try again later'
    }
});

// 8. Limiteur de Recherche (CPU Protection)
// Les Regex sont coûteuses, on limite la fréquence
// 60 recherches/minute (1 par seconde) pour une navigation fluide
const searchLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60,
    message: {
        status: 'error',
        message: 'Search rate limit exceeded'
    }
});

module.exports = {
    globalLimiter,
    authLimiter,
    createAccountLimiter,
    apiLimiter,
    uploadLimiter,
    reviewLimiter,
    orderLimiter,
    searchLimiter
};
