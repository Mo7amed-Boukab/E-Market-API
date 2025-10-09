require('dotenv').config();
const express = require('express');
const connectDB = require('./config/database');
const PORT = process.env.PORT;

const usersRouter = require("./routes/users");
const categoryRouter = require("./routes/category");
const productRouter = require("./routes/product");

const app = express();

connectDB();

app.use(express.json());

app.use("/users", usersRouter);
app.use("/categories", categoryRouter);
app.use("/products", productRouter);


app.get('/', (req, res) => {
  res.send('API is running...');
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
