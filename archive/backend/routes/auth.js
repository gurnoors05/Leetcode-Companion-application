const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const env = require('../config/env');

const router = express.Router();

const generateTokens = async (userId, githubUsername) => {
  const payload = { id: userId, username: githubUsername };
  
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '7d' });
  const refreshToken = crypto.randomBytes(40).toString('hex');
  
  // Hash refresh token for DB storage (simple sha256 is fine here as it's a high entropy random string)
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  
  // Expiry date (7 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  await db.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  );
  
  return { accessToken, refreshToken };
};

// Initiate GitHub OAuth
router.get(
  '/github',
  passport.authenticate('github', { scope: ['user:email', 'repo'] }) // require repo scope for sync
);

// GitHub OAuth Callback
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: '/login?error=auth_failed' }),
  async (req, res) => {
    try {
      const user = req.user;
      const { accessToken, refreshToken } = await generateTokens(user.id, user.github_username);
      
      // Set httpOnly cookie for web app
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      
      // Render popup HTML to send tokens back to the opener window
      const html = `
        <html>
          <body>
            <script>
              const targetOrigin = '${env.FRONTEND_URL}';
              if (window.opener) {
                window.opener.postMessage({
                  type: 'GITHUB_AUTH_SUCCESS',
                  payload: {
                    accessToken: '${accessToken}'
                  }
                }, targetOrigin);
                window.close();
              } else {
                document.body.innerHTML = 'Authentication successful. You can close this window.';
              }
            </script>
          </body>
        </html>
      `;
      res.send(html);
    } catch (error) {
      console.error('Auth callback error:', error);
      res.status(500).send('Authentication processing failed.');
    }
  }
);

// Refresh Token Route
router.post('/refresh', async (req, res) => {
  // Allow refresh token from cookie (web app) or authorization header/body (extension)
  let refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }
  
  try {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    // Find the token in the DB
    const tokenRes = await db.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()',
      [tokenHash]
    );
    
    if (tokenRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    
    const tokenRecord = tokenRes.rows[0];
    const userId = tokenRecord.user_id;
    
    // Get user to generate new payload
    const userRes = await db.query('SELECT github_username FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const payload = { id: userId, username: userRes.rows[0].github_username };
    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '7d' });
    
    // Optional: Rotate refresh token here (issue a new one, delete old).
    // For V1, keeping the existing refresh token until it expires is simpler.
    
    res.json({ accessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout Route
router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
  
  if (refreshToken) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await db.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
  }
  
  res.clearCookie('refresh_token');
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
