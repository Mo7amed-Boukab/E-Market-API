const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const {
    createReviewValidator,
    updateReviewValidator,
    reviewIdValidator,
    getProductReviewsValidator,
} = require('../validators/reviewValidator');
const { reviewLimiter } = require('../middlewares/rateLimitMiddleware');

/**
 * Routes des Avis (Reviews)
 */

// POST /api/v1/reviews - Créer un avis (User connecté)
router.post(
    '/',
    authenticate,
    authorize('user'), // Seuls les users peuvent laisser des avis (pas les sellers/admins sur leurs propres produits)
    reviewLimiter, // Protection Spam Avis
    createReviewValidator,
    reviewController.createReview
);

// GET /api/v1/reviews/product/:productId - Récupérer les avis d'un produit (Public)
router.get(
    '/product/:productId',
    getProductReviewsValidator,
    reviewController.getProductReviews
);

// PUT /api/v1/reviews/:id - Mettre à jour un avis (Auteur uniquement)
router.put(
    '/:id',
    authenticate,
    authorize('user'),
    updateReviewValidator,
    reviewController.updateReview
);

// DELETE /api/v1/reviews/:id - Supprimer un avis (Auteur ou Admin)
router.delete(
    '/:id',
    authenticate,
    authorize('user', 'admin'),
    reviewIdValidator,
    reviewController.deleteReview
);

// PATCH /api/v1/reviews/:id/vote - Voter "Utile" (User connecté)
router.patch(
    '/:id/vote',
    authenticate,
    authorize('user'),
    reviewIdValidator,
    reviewController.voteHelpful
);

module.exports = router;
