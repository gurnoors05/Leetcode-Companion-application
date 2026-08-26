// Initialize environment variables and strictly validate them
const env = require('./config/env');

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');

// Import routes & middleware
const authRoutes = require('./routes/auth');
const problemsRoutes = require('./routes/problems');
const patternsRoutes = require('./routes/patterns');
const { authLimiter } = require('./middleware/rateLimiter');
const { requireAuth } = require('./middleware/auth');

// Initialize Passport Strategies
require('./config/passport');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS configuration - only allow the frontend URL and Chrome Extension origin
const allowedOrigins = [
  env.FRONTEND_URL,
  // Add chrome-extension://<your-extension-id> here when known
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('chrome-extension://')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies to be sent
}));

app.use(passport.initialize());

// Routes
// Apply rate limiter specifically to auth routes
app.use('/auth', authLimiter, authRoutes);
app.use('/api/problems', requireAuth, problemsRoutes);
app.use('/api/patterns', requireAuth, patternsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start Server
app.listen(env.PORT, () => {
  console.log(`🚀 Server running on port ${env.PORT}`);
  console.log(`Frontend URL configured as: ${env.FRONTEND_URL}`);
});
