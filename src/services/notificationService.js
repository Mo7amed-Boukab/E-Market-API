const Notification = require('../models/notification');
const emailService = require('./emailService');
const socketService = require('./socketService');
const User = require('../models/user');
const logger = require('../utils/logger');

class NotificationService {
    /**
     * Méthode générique pour envoyer une notification
     * Gère : In-App (DB), Email (SMTP) et Realtime (Socket)
     */
    async notify(recipientId, options) {
        try {
            const {
                type = 'info',
                title,
                message,
                link,
                data,
                email = null
            } = options;

            // 1. Créer la notification In-App (Toujours)
            const notification = await Notification.create({
                recipient: recipientId,
                type,
                title,
                message,
                link,
                data
            });

            // 2. Envoyer en Temps Réel (Socket.io)
            // Le frontend écoutera l'événement 'notification'
            socketService.emitToUser(recipientId.toString(), 'notification', notification);

            // 3. Envoyer l'email (Si demandé)
            if (email) {
                // Récupérer l'email du user si on ne l'a pas
                const user = await User.findById(recipientId).select('email fullname');
                if (user && user.email) {
                    // Enrichir les données du template
                    const templateData = {
                        userName: user.fullname,
                        ...email.data,
                        ...data
                    };

                    // Envoyer de manière asynchrone
                    emailService.sendEmail(
                        user.email,
                        email.subject,
                        email.template,
                        templateData
                    ).catch(err => logger.error('Async email error:', err));
                }
            }
        } catch (error) {
            logger.error('Notification Error:', error);
            // On ne throw pas d'erreur pour ne pas bloquer le flux principal
        }
    }

    // --- Helpers Métier ---

    /**
     * Notifier un utilisateur de sa nouvelle commande
     */
    async notifyOrderCreated(order, userId) {
        await this.notify(userId, {
            type: 'success',
            title: 'Commande confirmée !',
            message: `Votre commande #${order.orderNumber} a été enregistrée avec succès.`,
            link: `/orders/${order._id}`,
            data: { orderId: order._id },
            email: {
                subject: `Confirmation de commande #${order.orderNumber}`,
                template: 'order_confirmation',
                data: {
                    orderNumber: order.orderNumber,
                    total: order.totalAmount,
                    itemsCount: order.items.length
                }
            }
        });
    }

    /**
     * Notifier un vendeur d'une nouvelle vente
     */
    async notifySellerNewSale(sellerId, order, amount) {
        await this.notify(sellerId, {
            type: 'success',
            title: 'Nouvelle vente !',
            message: `Vous avez réalisé une vente de ${amount} DH sur la commande #${order.orderNumber}.`,
            link: `/seller/orders/${order._id}`,
            data: { orderId: order._id },
            email: {
                subject: 'Nouvelle vente sur E-Market !',
                template: 'seller_new_sale',
                data: {
                    amount,
                    orderNumber: order.orderNumber
                }
            }
        });
    }

    /**
     * Notifier de la bienvenue
     */
    async notifyWelcome(userId) {
        await this.notify(userId, {
            type: 'info',
            title: 'Bienvenue !',
            message: 'Nous sommes ravis de vous compter parmi nous.',
            email: {
                subject: 'Bienvenue sur E-Market',
                template: 'welcome',
                data: {}
            }
        });
    }

    /**
     * Notifier d'un changement de statut de commande
     */
    async notifyOrderStatusChanged(order, userId, newStatus) {
        await this.notify(userId, {
            type: 'info',
            title: 'Mise à jour commande',
            message: `Votre commande #${order.orderNumber} est maintenant : ${newStatus}`,
            link: `/orders/${order._id}`,
            email: {
                subject: `Mise à jour commande #${order.orderNumber}`,
                template: 'order_status_update',
                data: {
                    orderNumber: order.orderNumber,
                    status: newStatus
                }
            }
        });
    }
}

module.exports = new NotificationService();
