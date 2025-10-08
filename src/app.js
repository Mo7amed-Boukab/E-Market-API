require('dotenv').config();
const express = require('express');
const connectDB = require('./config/database');
const PORT = process.env.PORT;

const app = express();

connectDB();


app.get('/', (req, res) => {
  res.send('API is running...');
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
