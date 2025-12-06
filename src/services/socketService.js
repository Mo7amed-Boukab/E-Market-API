const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class SocketService {
    constructor() {
        this.io = null;
        // Map pour stocker les sockets des utilisateurs connectés
        // userId -> [socketId1, socketId2] (un user peut être connecté sur PC et Mobile)
        this.userSockets = new Map();
    }

    /**
     * Initialiser Socket.io avec le serveur HTTP
     */
    init(server) {
        // Configuration CORS sécurisée
        const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ['http://localhost:5173', 'http://localhost:3000'];

        this.io = socketIo(server, {
            cors: {
                origin: (origin, callback) => {
                    // Autoriser les requêtes sans origine (ex: Postman, Mobile Apps) ou si l'origine est dans la liste
                    // En mode DEV, on est plus permissif
                    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
                        callback(null, true);
                    } else {
                        logger.warn(`Blocked CORS connection from: ${origin}`);
                        callback(new Error('Not allowed by CORS'));
                    }
                },
                methods: ['GET', 'POST'],
                credentials: true
            }
        });

        // Gestion globale des erreurs serveur Socket.io
        this.io.engine.on("connection_error", (err) => {
            logger.error(`Socket Connection Error: ${err.req ? err.req.url : ''} - ${err.message}`);
        });

        // Middleware d'authentification Socket
        this.io.use((socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    return next(new Error('Authentication error: Token required'));
                }

                // Vérifier le token
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.userId = decoded.userId;
                next();
            } catch (error) {
                next(new Error('Authentication error: Invalid token'));
            }
        });

        // Gestion des connexions
        this.io.on('connection', (socket) => {
            logger.info(`User connected via Socket: ${socket.userId}`);

            this.addUserSocket(socket.userId, socket.id);

            // Rejoindre une "room" privée pour cet utilisateur
            // C'est la méthode standard pour envoyer des messages à un user spécifique
            socket.join(`user:${socket.userId}`);

            socket.on('disconnect', () => {
                logger.info(`User disconnected: ${socket.userId}`);
                this.removeUserSocket(socket.userId, socket.id);
            });
        });

        logger.info('Socket.io Service initialized');
    }

    /**
     * Ajouter un socket au map
     */
    addUserSocket(userId, socketId) {
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, []);
        }
        this.userSockets.get(userId).push(socketId);
    }

    /**
     * Retirer un socket du map
     */
    removeUserSocket(userId, socketId) {
        if (this.userSockets.has(userId)) {
            const sockets = this.userSockets.get(userId).filter(id => id !== socketId);
            if (sockets.length === 0) {
                this.userSockets.delete(userId);
            } else {
                this.userSockets.set(userId, sockets);
            }
        }
    }

    /**
     * Envoyer un événement à un utilisateur spécifique
     * @param {string} userId - ID de l'utilisateur cible
     * @param {string} event - Nom de l'événement (ex: 'notification')
     * @param {object} data - Données à envoyer
     */
    emitToUser(userId, event, data) {
        if (!this.io) {
            logger.warn('Socket.io not initialized');
            return;
        }

        // Envoyer à la room de l'utilisateur
        this.io.to(`user:${userId}`).emit(event, data);
    }

    /**
     * Envoyer à tous les utilisateurs (Broadcast)
     */
    emitToAll(event, data) {
        if (this.io) {
            this.io.emit(event, data);
        }
    }
}

// Singleton
module.exports = new SocketService();
