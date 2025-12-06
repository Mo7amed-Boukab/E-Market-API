const Notification = require('../models/notification');
const ApiError = require('../utils/ApiError');

class NotificationController {
    /**
     * Récupérer mes notifications
     */
    async getMyNotifications(req, res, next) {
        try {
            const userId = req.user.userId;
            const { page = 1, limit = 20, unreadOnly } = req.query;

            const query = { recipient: userId, deleted: false };
            if (unreadOnly === 'true') {
                query.isRead = false;
            }

            const notifications = await Notification.find(query)
                .sort('-createdAt')
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const count = await Notification.countDocuments(query);

            // Compter le total des non-lues (pour le badge rouge)
            const unreadCount = await Notification.countDocuments({
                recipient: userId,
                deleted: false,
                isRead: false
            });

            res.status(200).json({
                notifications,
                unreadCount,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    pages: Math.ceil(count / limit)
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Marquer une notification comme lue
     */
    async markAsRead(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;

            const notification = await Notification.findOne({
                _id: id,
                recipient: userId
            });

            if (!notification) {
                throw ApiError.notFound('Notification not found');
            }

            notification.isRead = true;
            await notification.save();

            res.status(200).json({
                message: 'Marked as read',
                notification
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Marquer TOUTES les notifications comme lues
     */
    async markAllAsRead(req, res, next) {
        try {
            const userId = req.user.userId;

            await Notification.updateMany(
                { recipient: userId, isRead: false },
                { isRead: true }
            );

            res.status(200).json({
                message: 'All notifications marked as read'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Supprimer une notification
     */
    async deleteNotification(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;

            await Notification.deleteOne({ _id: id, recipient: userId });

            res.status(200).json({
                message: 'Notification deleted'
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new NotificationController();
