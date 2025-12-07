require('dotenv').config();
const app = require('./src/app');
const dbConnection = require('./src/config/database');
const http = require('http');
const socketService = require('./src/services/socketService');

const PORT = process.env.PORT || 3000;

// Créer le serveur HTTP explicitement pour Socket.io
const server = http.createServer(app);

dbConnection().then(() => {
    // Initialiser Socket.io
    socketService.init(server);

    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Socket.io initialized`);
    });
}); 