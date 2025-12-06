const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/apiRoutes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Run server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});