import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';
import { getJwtAccessSecret } from '@/lib/env';
import { decrypt } from '@/lib/crypto';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('jwt_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = jwt.verify(token, getJwtAccessSecret(), { algorithms: ['HS256'] }) as any;
    const userId = payload.id;

    const { repoName, isNew } = await req.json();
    if (!repoName) {
      return NextResponse.json({ error: 'Repo name is required' }, { status: 400 });
    }

    // 1. Get user's github access token
    const userRes = await db.query('SELECT github_username, github_access_token FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0 || !userRes.rows[0].github_access_token) {
      return NextResponse.json({ error: 'GitHub account not linked' }, { status: 400 });
    }
    
    const user = userRes.rows[0];
    const githubToken = decrypt(user.github_access_token);
    let finalRepoFullName = '';

    // 2. Handle repo creation or verification
    if (isNew) {
      // Create new repo
      const createRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: repoName,
          description: 'My LeetCode solutions synced via LeetCode Companion',
          private: false,
          auto_init: true
        })
      });

      if (!createRes.ok) {
        const errorData = await createRes.json();
        return NextResponse.json({ error: `Failed to create repo: ${errorData.message || 'Unknown error'}` }, { status: 500 });
      }
      
      const repoData = await createRes.json();
      finalRepoFullName = repoData.full_name; // e.g. "username/repoName"
    } else {
      // Verify existing repo (repoName should be "owner/repo" or just "repo" assuming their username)
      finalRepoFullName = repoName.includes('/') ? repoName : `${user.github_username}/${repoName}`;
      
      const getRes = await fetch(`https://api.github.com/repos/${finalRepoFullName}`, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!getRes.ok) {
        return NextResponse.json({ error: `Repository not found or no access: ${finalRepoFullName}` }, { status: 404 });
      }
    }

    // 3. Save to DB
    await db.query('UPDATE users SET github_sync_repo = $1 WHERE id = $2', [finalRepoFullName, userId]);

    return NextResponse.json({ success: true, repo: finalRepoFullName });
  } catch (error) {
    console.error('Setup repo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
