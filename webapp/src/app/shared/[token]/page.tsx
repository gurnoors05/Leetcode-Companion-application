'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Brain, Code2, AlignLeft, ExternalLink } from 'lucide-react';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function SharedApproachPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) fetchSharedData();
  }, [token]);

  const fetchSharedData = async () => {
    try {
      const res = await fetch(`/api/shared/${token}`);
      if (!res.ok) {
        setError('Approach not found or is no longer shared.');
      } else {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      setError('An error occurred while fetching the shared approach.');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch(diff) {
      case 'easy': return 'text-success bg-success/10 border-success/20';
      case 'medium': return 'text-warning bg-warning/10 border-warning/20';
      case 'hard': return 'text-error bg-error/10 border-error/20';
      default: return 'text-zinc-500 bg-zinc-800/50 border-zinc-700';
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background text-zinc-500 gap-4">
        <div className="text-xl font-bold">{error || 'Not found'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col p-4 md:p-8">
      <div className="max-w-5xl w-full mx-auto space-y-6">
        
        {/* Read-Only Banner */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center text-primary font-bold tracking-wide text-sm">
          Shared View (Read-Only)
        </div>

        {/* Header */}
        <div className="bg-surface border border-surfaceHighlight rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-mono text-zinc-400 bg-black/40 px-2.5 py-1 rounded-md border border-zinc-800">
              #{data.leetcode_number || '?'}
            </span>
            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getDifficultyColor(data.difficulty)}`}>
              {data.difficulty}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100">{data.title}</h1>
            {data.leetcode_url && (
              <a 
                href={data.leetcode_url} 
                target="_blank" 
                rel="noreferrer"
                className="p-1.5 hover:bg-surfaceHighlight rounded-lg text-zinc-400 hover:text-white transition-colors"
                title="Open on LeetCode"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="bg-surface border border-surfaceHighlight rounded-xl p-6 shadow-xl space-y-8">
          <div className="flex items-center justify-between pb-4 border-b border-surfaceHighlight/50">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-primary uppercase tracking-wide">
                {data.pattern_name}
              </h2>
            </div>
            
            {/* Complexities */}
            <div className="flex gap-4">
              {(data.time_complexity || data.ai_time_complexity) && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">T.C.</span>
                  <span className="text-xs font-mono text-warning bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20">
                    {data.time_complexity || data.ai_time_complexity}
                  </span>
                </div>
              )}
              {(data.space_complexity || data.ai_space_complexity) && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">S.C.</span>
                  <span className="text-xs font-mono text-error bg-error/10 px-1.5 py-0.5 rounded border border-error/20">
                    {data.space_complexity || data.ai_space_complexity}
                  </span>
                </div>
              )}
            </div>
          </div>

          {data.ai_reasoning && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm text-zinc-300 flex items-start gap-3">
              <Brain className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-primary text-xs uppercase tracking-wide mb-1 block">AI Summary</span>
                {data.ai_reasoning}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Notes Section */}
            <div className="bg-background border border-surfaceHighlight rounded-xl overflow-hidden flex flex-col min-h-[300px]">
              <div className="bg-surfaceHighlight/30 px-4 py-3 border-b border-surfaceHighlight flex items-center gap-2 text-zinc-400">
                <AlignLeft className="w-4 h-4" />
                <h4 className="text-[11px] uppercase tracking-wider font-bold">Approach Notes</h4>
              </div>
              <div className="flex-1 p-5">
                {data.approach_notes ? (
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{data.approach_notes}</p>
                ) : (
                  <div className="flex items-center justify-center h-full text-zinc-600 italic text-sm">
                    No notes provided
                  </div>
                )}
              </div>
            </div>
            
            {/* Code Section */}
            <div className="bg-background border border-surfaceHighlight rounded-xl overflow-hidden flex flex-col min-h-[300px]">
              <div className="bg-surfaceHighlight/30 px-4 py-3 border-b border-surfaceHighlight flex items-center gap-2 text-zinc-400">
                <Code2 className="w-4 h-4" />
                <h4 className="text-[11px] uppercase tracking-wider font-bold">Implementation</h4>
                {data.language && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 font-mono ml-2">
                    {data.language}
                  </span>
                )}
              </div>
              <div className="flex-1">
                {data.code_snippet ? (
                  <SyntaxHighlighter 
                    language={data.language || "cpp"} 
                    style={vscDarkPlus}
                    customStyle={{ margin: 0, padding: '1.5rem', fontSize: '0.85rem', backgroundColor: 'transparent', height: '100%' }}
                  >
                    {data.code_snippet}
                  </SyntaxHighlighter>
                ) : (
                  <div className="flex items-center justify-center h-full text-zinc-600 italic text-sm p-4">
                    No code provided
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
