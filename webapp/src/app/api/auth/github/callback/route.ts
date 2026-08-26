import { NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';
import { encrypt } from '@/lib/crypto';
import { getJwtAccessSecret } from '@/lib/env';

const generateTokens = async (userId: number, githubUsername: string) => {
  const payload = { id: userId, username: githubUsername };
  
  const accessToken = jwt.sign(payload, getJwtAccessSecret(), { expiresIn: '7d' });
  const refreshToken = crypto.randomBytes(40).toString('hex');
  
  // Hash refresh token for DB storage
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', process.env.FRONTEND_URL || 'http://localhost:5173'));
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    
    const tokenData = await tokenRes.json();
    const githubAccessToken = tokenData.access_token;
    
    if (!githubAccessToken) {
      throw new Error('Failed to obtain access token from GitHub');
    }

    // 2. Fetch user profile
    const profileRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    
    const profile = await profileRes.json();
    
    // Also fetch emails as the primary might be private
    const emailRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    const emails = await emailRes.json();
    const primaryEmail = emails.find((e: any) => e.primary)?.email || null;

    const githubId = profile.id.toString();
    const username = profile.login; // github returns 'login' for username
    const avatarUrl = profile.avatar_url;
    
    // 3. Save to DB
    const encryptedToken = encrypt(githubAccessToken);

    const userRes = await db.query('SELECT * FROM users WHERE github_id = $1 OR email = $2', [githubId, primaryEmail]);
    let user;

    if (userRes.rows.length > 0) {
      // Link or update existing user
      const existingUser = userRes.rows[0];
      const updateRes = await db.query(
        `UPDATE users 
         SET github_id = $1, github_username = $2, avatar_url = $3, github_access_token = $4, updated_at = NOW() 
         WHERE id = $5 
         RETURNING *`,
        [githubId, username, avatarUrl, encryptedToken, existingUser.id]
      );
      user = updateRes.rows[0];
    } else {
      const insertRes = await db.query(
        `INSERT INTO users (github_id, github_username, email, avatar_url, github_access_token) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [githubId, username, primaryEmail, avatarUrl, encryptedToken]
      );
      user = insertRes.rows[0];
    }

    // 4. Generate our JWTs
    const { accessToken, refreshToken } = await generateTokens(user.id, user.github_username);
    
    // 5. Render HTML response with cookie
    const html = `
      <html>
        <body>
          <script>
            const targetOrigin = '${process.env.FRONTEND_URL || 'http://localhost:5173'}';
            if (window.opener) {
              window.opener.postMessage({
                type: 'GITHUB_AUTH_SUCCESS',
                payload: {
                  accessToken: '${accessToken}'
                }
              }, targetOrigin);
              window.close();
            } else {
              // Direct navigation from webapp
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `;

    const response = new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    response.cookies.set('jwt_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;
  } catch (error) {
    console.error('Auth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Authentication processing failed.', details: errorMessage }, { status: 500 });
  }
}
