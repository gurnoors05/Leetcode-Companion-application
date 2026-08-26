import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';
import { getJwtAccessSecret } from '@/lib/env';
import { decrypt } from '@/lib/crypto';

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { problemId, patternId, customFolderName } = body;

    if (!problemId || !patternId) {
      return NextResponse.json({ error: 'problemId and patternId are required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('jwt_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = jwt.verify(token, getJwtAccessSecret(), { algorithms: ['HS256'] }) as any;
    const userId = payload.id;

    // 1. Get user data
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

    // 2. Get problem and pattern details
    const approachRes = await db.query(`
      SELECT p.title, p.leetcode_number, p.leetcode_url, p.difficulty,
             pat.name as pattern_name,
             pp.code_snippet, pp.approach_notes, pp.time_complexity, pp.space_complexity
      FROM problems p
      JOIN problem_patterns pp ON p.id = pp.problem_id
      JOIN patterns pat ON pp.pattern_id = pat.id
      WHERE p.id = $1 AND pp.pattern_id = $2 AND p.user_id = $3
    `, [problemId, patternId, userId]);

    if (approachRes.rows.length === 0) {
      return NextResponse.json({ error: 'Approach not found' }, { status: 404 });
    }
    const approach = approachRes.rows[0];

    // 3. Construct file path and content
    const code = approach.code_snippet || '';
    let ext = 'txt';
    if (code.includes('def ') || code.includes('import sys')) ext = 'py';
    else if (code.includes('public class ') || code.includes('System.out')) ext = 'java';
    else if (code.includes('function ') || code.includes('=>') || code.includes('console.log')) ext = 'js';
    else if (code.includes('#include <') || code.includes('std::')) ext = 'cpp';
    else if (code.includes('package main') || code.includes('func ')) ext = 'go';

    const folderName = slugify(customFolderName || approach.pattern_name || 'uncategorized');
    const fileName = `${approach.leetcode_number}-${slugify(approach.title)}.${ext}`;
    const filePath = `${folderName}/${fileName}`;

    let fileContent = `// Problem: ${approach.title}\n`;
    fileContent += `// Difficulty: ${approach.difficulty}\n`;
    fileContent += `// URL: ${approach.leetcode_url}\n\n`;
    
    if (approach.approach_notes) {
      fileContent += `/* \nNotes:\n${approach.approach_notes}\n*/\n\n`;
    }
    
    if (approach.time_complexity || approach.space_complexity) {
      fileContent += `// Time Complexity: ${approach.time_complexity || 'N/A'}\n`;
      fileContent += `// Space Complexity: ${approach.space_complexity || 'N/A'}\n\n`;
    }
    
    fileContent += code;

    const base64Content = Buffer.from(fileContent).toString('base64');

    // 4. Check if file already exists to get SHA (for updating)
    let sha = undefined;
    const checkRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filePath}`, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (checkRes.ok) {
      const fileData = await checkRes.json();
      sha = fileData.sha;
    }

    // 5. Push to GitHub
    const pushRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `${sha ? 'Update' : 'Add'} ${approach.title} solution`,
        content: base64Content,
        sha
      })
    });

    if (!pushRes.ok) {
      const errorData = await pushRes.json();
      return NextResponse.json({ error: `GitHub API error: ${errorData.message}` }, { status: 500 });
    }

    const resultData = await pushRes.json();
    const htmlUrl = resultData.content.html_url;

    // 6. Save URL to database
    await db.query(
      'UPDATE problem_patterns SET github_synced_url = $1 WHERE problem_id = $2 AND pattern_id = $3',
      [htmlUrl, problemId, patternId]
    );

    return NextResponse.json({ success: true, url: htmlUrl });
  } catch (error) {
    console.error('Push to GitHub error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
