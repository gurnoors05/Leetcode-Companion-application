import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const callbackUrl = process.env.GITHUB_CALLBACK_URL;
  
  if (!clientId || !callbackUrl) {
    return NextResponse.json({ error: 'GitHub OAuth is not configured' }, { status: 500 });
  }

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', clientId);
  githubAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  githubAuthUrl.searchParams.set('scope', 'user:email repo'); // require repo scope for sync

  return NextResponse.redirect(githubAuthUrl.toString());
}
