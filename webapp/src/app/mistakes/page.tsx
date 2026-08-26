import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import { getJwtAccessSecret } from '@/lib/env';
import MistakeLogTable from './MistakeLogTable';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('jwt_token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, getJwtAccessSecret(), { algorithms: ['HS256'] }) as any;
  } catch (e) {
    return null;
  }
}

export default async function MistakeLogPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('jwt_token')?.value || '';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-surfaceHighlight pb-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-1 tracking-tight">Mistake Log</h1>
          <p className="text-sm text-zinc-400">Track and review failed submissions before they were accepted.</p>
        </div>
      </div>

      <div className="pt-4">
        <MistakeLogTable jwt={token} />
      </div>
    </div>
  );
}
