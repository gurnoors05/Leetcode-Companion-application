import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';
import { getJwtAccessSecret } from '@/lib/env';
import PatternRadarChart, { PatternData } from '@/components/charts/PatternRadarChart';
import DataTable, { Problem } from '@/components/ui/DataTable';
import { BrainCircuit, Trophy, Code2 } from 'lucide-react';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('jwt_token')?.value;

  if (!token) return null;

  try {
    const payload = jwt.verify(token, getJwtAccessSecret(), { algorithms: ['HS256'] }) as any;
    return payload;
  } catch (e) {
    return null;
  }
}

async function getDashboardData(userId: number) {
  // Fetch problems with their patterns
  const problemsRes = await db.query(`
    SELECT p.id, p.title, p.leetcode_url, p.leetcode_number, p.difficulty, p.status, p.date_solved, p.topic_tags, p.next_review_date,
           COALESCE(
             json_agg(
               json_build_object(
                 'name', pat.name,
                 'pattern_id', pp.pattern_id,
                 'approach_notes', pp.approach_notes,
                 'code_snippet', pp.code_snippet,
                 'time_complexity', pp.time_complexity,
                 'space_complexity', pp.space_complexity,
                 'ai_reasoning', pp.ai_reasoning,
                 'ai_time_complexity', pp.ai_time_complexity,
                 'ai_space_complexity', pp.ai_space_complexity,
                 'ai_verified', pp.ai_verified,
                 'github_synced_url', pp.github_synced_url
               )
             ) FILTER (WHERE pat.name IS NOT NULL), 
             '[]'
           ) as pattern_details,
           BOOL_OR(pp.ai_verified) as ai_verified
    FROM problems p
    LEFT JOIN problem_patterns pp ON p.id = pp.problem_id
    LEFT JOIN patterns pat ON pp.pattern_id = pat.id
    WHERE p.user_id = $1
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `, [userId]);

  const problems: Problem[] = problemsRes.rows.map(row => ({
    ...row,
    patterns: row.pattern_details.map((pd: any) => pd.name),
    pattern_details: row.pattern_details,
    topic_tags: row.topic_tags || [],
    date_solved: row.date_solved ? row.date_solved.toISOString() : null,
    ai_verified: row.ai_verified || false
  }));

  // Fetch pattern aggregation for Radar Chart
  const patternRes = await db.query(`
    SELECT pat.name as pattern, COUNT(pp.problem_id)::int as count
    FROM patterns pat
    JOIN problem_patterns pp ON pat.id = pp.pattern_id
    WHERE pat.user_id = $1
    GROUP BY pat.name
    ORDER BY count DESC
    LIMIT 6
  `, [userId]);

  const radarData: PatternData[] = patternRes.rows;

  return { problems, radarData };
}

import AuthSync from '@/components/ui/AuthSync';

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('jwt_token')?.value || '';

  const { problems, radarData } = await getDashboardData(user.id);
  const totalSolved = problems.length;
  const hardSolved = problems.filter(p => p.difficulty === 'hard').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <AuthSync token={token} />
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-surfaceHighlight pb-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-1 tracking-tight">Overview</h1>
          <p className="text-sm text-zinc-400">Welcome back, {user.username}. Here is your progression.</p>
        </div>
      </div>

      {/* Top Stats & Radar Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Quick Stats */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-surface border border-surfaceHighlight rounded-lg p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Trophy className="w-4 h-4 text-zinc-300" />
              <p className="text-xs font-semibold tracking-wide uppercase">Total Solved</p>
            </div>
            <h2 className="text-3xl font-bold text-zinc-100">{totalSolved}</h2>
          </div>
          
          <div className="bg-surface border border-surfaceHighlight rounded-lg p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <BrainCircuit className="w-4 h-4 text-error" />
              <p className="text-xs font-semibold tracking-wide uppercase">Hard Problems</p>
            </div>
            <h2 className="text-3xl font-bold text-zinc-100">{hardSolved}</h2>
          </div>

          <div className="bg-surface border border-surfaceHighlight rounded-lg p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Code2 className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold tracking-wide uppercase">Top Pattern</p>
            </div>
            <h2 className="text-xl font-bold text-zinc-100 truncate">
              {radarData.length > 0 ? radarData[0].pattern : '-'}
            </h2>
          </div>
        </div>

        {/* Right Column: Radar Chart */}
        <div className="lg:col-span-2 bg-surface border border-surfaceHighlight rounded-lg p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-zinc-100 mb-4 tracking-wide uppercase">Pattern Mastery</h3>
          <div className="flex-grow flex items-center justify-center">
            <div className="w-full h-[280px]">
              <PatternRadarChart data={radarData} />
            </div>
          </div>
        </div>
      </div>

      {/* Data Table Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-100 tracking-wide uppercase">Problem History</h3>
        </div>
        <DataTable data={problems} jwt={token} />
      </div>

    </div>
  );
}
