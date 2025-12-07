const express = require('express');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/apiRoutes');
const authRoutes = require('./routes/authRoutes');
const authMiddleware = require('./middleware/userMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// public routes (wo jwt)
app.use('/api/auth', authRoutes);

// everything else /api protected by jwt
app.use('/api', authMiddleware, apiRoutes);

// Run server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
