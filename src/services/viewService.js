const ProductView = require('../models/productView');
const Product = require('../models/product');

/**
 * Service de gestion des vues de produits
 * - Protection anti-spam
 * - Limitation par IP et utilisateur
 * - Exclusion des sellers et admins
 */
class ViewService {
    /**
     * Extraire l'adresse IP réelle de la requête
     * @param {Request} req - Requête Express
     * @returns {String} - Adresse IP
     */
    getClientIp(req) {
        // Vérifier les headers de proxy (Cloudflare, Nginx, etc.)
        const forwarded = req.headers['x-forwarded-for'];
        if (forwarded) {
            return forwarded.split(',')[0].trim();
        }

        const realIp = req.headers['x-real-ip'];
        if (realIp) {
            return realIp;
        }

        // Fallback sur l'IP de connexion
        return req.ip || req.connection.remoteAddress || 'unknown';
    }

    /**
     * Incrémenter les vues d'un produit de manière professionnelle
     * @param {ObjectId} productId - ID du produit
     * @param {Request} req - Requête Express
     * @returns {Object} - Résultat de l'opération
     */
    async incrementView(productId, req) {
        try {
            // Récupérer le produit
            const product = await Product.findById(productId);
            if (!product) {
                return { success: false, reason: 'Product not found' };
            }

            // 1. Ne pas compter les vues pour les produits non publiés
            if (product.status !== 'published') {
                return { success: false, reason: 'Product not published' };
            }

            // 2. Ne pas compter les vues pour les produits supprimés
            if (product.deleted) {
                return { success: false, reason: 'Product deleted' };
            }

            const userId = req.user?.userId || null;
            const userRole = req.user?.role || null;
            const ipAddress = this.getClientIp(req);
            const userAgent = req.headers['user-agent'] || 'unknown';

            // 3. Ne pas compter les vues du seller propriétaire
            if (userId && product.seller.toString() === userId) {
                return { success: false, reason: 'Owner view not counted' };
            }

            // 4. Ne pas compter les vues des admins (vues de modération)
            if (userRole === 'admin') {
                return { success: false, reason: 'Admin view not counted' };
            }

            // 5. Vérifier si la vue doit être comptée (limitation 24h)
            const shouldCount = await ProductView.shouldCountView(productId, userId, ipAddress);

            if (!shouldCount) {
                return { success: false, reason: 'Already viewed in last 24h' };
            }

            // 6. Enregistrer la vue
            await ProductView.recordView(productId, userId, ipAddress, userAgent);

            // 7. Incrémenter le compteur dans le produit
            product.stats.views += 1;
            await product.save();

            return {
                success: true,
                totalViews: product.stats.views,
                message: 'View counted successfully'
            };
        } catch (error) {
            console.error('Error incrementing view:', error);
            return { success: false, reason: 'Internal error' };
        }
    }

    /**
     * Obtenir les statistiques détaillées de vues d'un produit
     * @param {ObjectId} productId - ID du produit
     * @returns {Object} - Statistiques détaillées
     */
    async getViewStatistics(productId) {
        try {
            const product = await Product.findById(productId);
            if (!product) {
                return null;
            }

            const detailedStats = await ProductView.getViewStats(productId);

            return {
                total: product.stats.views,
                detailed: detailedStats,
            };
        } catch (error) {
            console.error('Error getting view statistics:', error);
            return null;
        }
    }

    /**
     * Obtenir les produits les plus vus
     * @param {Number} limit - Nombre de produits à retourner
     * @param {String} period - Période ('today', 'week', 'month', 'all')
     * @returns {Array} - Liste des produits les plus vus
     */
    async getMostViewedProducts(limit = 10, period = 'all') {
        try {
            let dateFilter = {};

            if (period !== 'all') {
                const now = new Date();
                let startDate;

                switch (period) {
                    case 'today':
                        startDate = new Date(now - 24 * 60 * 60 * 1000);
                        break;
                    case 'week':
                        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
                        break;
                    case 'month':
                        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
                        break;
                    default:
                        startDate = null;
                }

                if (startDate) {
                    dateFilter = { viewedAt: { $gte: startDate } };
                }
            }

            // Agréger les vues par produit
            const viewCounts = await ProductView.aggregate([
                { $match: dateFilter },
                { $group: { _id: '$product', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: limit },
            ]);

            // Récupérer les détails des produits
            const productIds = viewCounts.map(v => v._id);
            const products = await Product.find({
                _id: { $in: productIds },
                deleted: false,
                status: 'published'
            })
                .populate('categories', 'name')
                .populate('seller', 'fullname email');

            // Combiner les résultats
            const result = viewCounts.map(vc => {
                const product = products.find(p => p._id.toString() === vc._id.toString());
                return {
                    product,
                    viewCount: vc.count,
                };
            }).filter(item => item.product); // Filtrer les produits supprimés

            return result;
        } catch (error) {
            console.error('Error getting most viewed products:', error);
            return [];
        }
    }
}

module.exports = new ViewService();
