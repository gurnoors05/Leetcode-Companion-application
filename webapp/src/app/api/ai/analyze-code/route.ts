import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { analyzeCodeWithAI } from '@/lib/ai';
import { setAiCache } from '@/lib/aiCache';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';

export const POST = withAuth(
  async (req: AuthenticatedRequest) => {
    try {
      const body = await req.json();
      const { code, language, title, difficulty } = body;

      if (!code) {
        return NextResponse.json({ error: 'Code is required' }, { status: 400 });
      }

      // Hash the code
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');

      // Call AI
      const aiResult = await analyzeCodeWithAI(code, language || 'unknown', title || 'unknown', difficulty || 'unknown');

      const cachePayload = {
        ai_suggested_patterns: aiResult.suggestedPatterns.map(p => ({ pattern_name: p })),
        ai_time_complexity: aiResult.timeComplexity,
        ai_space_complexity: aiResult.spaceComplexity,
        ai_reasoning: aiResult.reasoning,
      };

      // Store in anti-abuse cache
      setAiCache(codeHash, cachePayload);

      return NextResponse.json({
        ...cachePayload,
        code_hash: codeHash
      });
    } catch (error: any) {
      console.error('AI Analysis Error:', error);
      return NextResponse.json({ error: error.message || 'Failed to analyze code' }, { status: 500 });
    }
  }
);
