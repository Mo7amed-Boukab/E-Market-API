const app = require('./src/app');
const dbConnection = require('./src/config/database');

const PORT = process.env.PORT || 3000;

dbConnection().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}); 