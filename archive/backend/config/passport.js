const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const db = require('./db');
const env = require('./env');
const { encrypt } = require('../utils/crypto');

passport.use(
  new GitHubStrategy(
    {
      clientID: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      callbackURL: env.GITHUB_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const githubId = profile.id.toString();
        const username = profile.username;
        const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
        const avatarUrl = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;
        
        // Encrypt the GitHub access token
        const encryptedToken = encrypt(accessToken);

        // Check if user exists
        const userRes = await db.query('SELECT * FROM users WHERE github_id = $1', [githubId]);
        let user;

        if (userRes.rows.length > 0) {
          // User exists, update token and info
          const updateRes = await db.query(
            `UPDATE users 
             SET github_username = $1, email = $2, avatar_url = $3, github_access_token = $4, updated_at = NOW() 
             WHERE github_id = $5 
             RETURNING *`,
            [username, email, avatarUrl, encryptedToken, githubId]
          );
          user = updateRes.rows[0];
        } else {
          // Create new user
          const insertRes = await db.query(
            `INSERT INTO users (github_id, github_username, email, avatar_url, github_access_token) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [githubId, username, email, avatarUrl, encryptedToken]
          );
          user = insertRes.rows[0];
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// We don't necessarily need serializeUser/deserializeUser if we aren't using passport sessions,
// but it's good practice to provide minimal implementations if passport requires it in some flows.
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const res = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, res.rows[0]);
  } catch (err) {
    done(err, null);
  }
});
