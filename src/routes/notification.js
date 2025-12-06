const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/authMiddleware');
const { param } = require('express-validator');
const validatorMiddleware = require('../middlewares/validationMiddleware');
const mongoose = require('mongoose');

/**
 * Routes Notifications
 */

// Validator ID
const idValidator = [
    param('id')
        .custom((id) => mongoose.Types.ObjectId.isValid(id))
        .withMessage('Invalid notification ID'),
    validatorMiddleware
];

// GET /api/v1/notifications - Mes notifications
router.get(
    '/',
    authenticate,
    notificationController.getMyNotifications
);

// PATCH /api/v1/notifications/mark-all-read - Tout marquer comme lu
router.patch(
    '/mark-all-read',
    authenticate,
    notificationController.markAllAsRead
);

// PATCH /api/v1/notifications/:id/read - Marquer une comme lue
router.patch(
    '/:id/read',
    authenticate,
    idValidator,
    notificationController.markAsRead
);

// DELETE /api/v1/notifications/:id - Supprimer
router.delete(
    '/:id',
    authenticate,
    idValidator,
    notificationController.deleteNotification
);

module.exports = router;
