require('dotenv').config();
const express = require('express');
const connectDB = require('./config/database');
const { specs, swaggerUi } = require('./config/swagger');
const PORT = process.env.PORT;

const usersRouter = require("./routes/users");
const categoryRouter = require("./routes/category");
const productRouter = require("./routes/product");

const app = express();

connectDB();

app.use(express.json());

// Configuration Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use("/users", usersRouter);
app.use("/categories", categoryRouter);
app.use("/products", productRouter);


/**
 * @swagger
 * /:
 *   get:
 *     summary: Vérification de l'état de l'API
 *     description: Endpoint pour vérifier que l'API fonctionne correctement
 *     tags: [Health Check]
 *     responses:
 *       200:
 *         description: API en fonctionnement
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "API is running..."
 */
app.get('/', (req, res) => {
  res.send('API is running...');
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
