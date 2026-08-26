import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';
import { getJwtAccessSecret } from '@/lib/env';
import { decrypt } from '@/lib/crypto';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('jwt_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = jwt.verify(token, getJwtAccessSecret(), { algorithms: ['HS256'] }) as any;
    const userId = payload.id;

    // Get user data
    const userRes = await db.query('SELECT github_access_token, github_sync_repo FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0 || !userRes.rows[0].github_access_token) {
      return NextResponse.json({ error: 'GitHub account not linked' }, { status: 400 });
    }
    const user = userRes.rows[0];
    if (!user.github_sync_repo) {
      return NextResponse.json({ error: 'GitHub sync repository not configured', code: 'NO_REPO' }, { status: 400 });
    }
    
    const githubToken = decrypt(user.github_access_token);
    const repoFullName = user.github_sync_repo;

    // Fetch repository contents at root level
    const githubRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents`, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!githubRes.ok) {
      const errorData = await githubRes.json();
      return NextResponse.json({ error: `GitHub API error: ${errorData.message}` }, { status: githubRes.status });
    }

    const items = await githubRes.json();
    
    // Filter for directories only
    const folders = items
      .filter((item: any) => item.type === 'dir' && !item.name.startsWith('.'))
      .map((item: any) => item.name);

    return NextResponse.json({ folders });
  } catch (error) {
    console.error('Fetch GitHub folders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
