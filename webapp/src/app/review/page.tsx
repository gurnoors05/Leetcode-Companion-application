"use client";

import React, { useState, useEffect } from 'react';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Loader2, Calendar, Brain, Trash2, CalendarClock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ReviewPage() {
  const router = useRouter();
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingSchedule, setPendingSchedule] = useState<{problemId: number, dateStr: string} | null>(null);

  useEffect(() => {
    fetchQueue();
  }, [router]);

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/review/queue');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setQueue(data.queue || []);
      }
    } catch (e) {
      console.error("Failed to fetch queue", e);
    } finally {
      setLoading(false);
    }
  };

  const confirmScheduleChange = () => {
    if (pendingSchedule) {
      handleScheduleChange(pendingSchedule.problemId, pendingSchedule.dateStr);
      setPendingSchedule(null);
    }
  };

  const handleScheduleChange = async (problemId: number, dateStr: string) => {
    try {
      const res = await fetch(`/api/problems/${problemId}/review-schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr || null })
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        fetchQueue();
      } else {
        alert('Failed to update schedule');
      }
    } catch (e) {
      console.error(e);
      alert('Error updating schedule');
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = queue.filter(item => {
    const d = new Date(item.next_review_date);
    d.setHours(0,0,0,0);
    return d <= today;
  });

  const upcoming = queue.filter(item => {
    const d = new Date(item.next_review_date);
    d.setHours(0,0,0,0);
    return d > today;
  });

  const getDifficultyColor = (diff: string) => {
    switch(diff) {
      case 'easy': return 'text-success bg-success/10 border-success/20';
      case 'medium': return 'text-warning bg-warning/10 border-warning/20';
      case 'hard': return 'text-error bg-error/10 border-error/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const renderProblemCard = (item: any) => {
    return (
      <div key={item.problem_id} className="bg-surface border border-surfaceHighlight rounded-xl overflow-hidden shadow-lg mb-8">
        {/* Header */}
        <div className="bg-surfaceHighlight/30 p-6 border-b border-surfaceHighlight flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono text-zinc-500 bg-black/40 px-2 py-1 rounded">
                #{item.leetcode_number || '?'}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wider ${getDifficultyColor(item.difficulty)}`}>
                {item.difficulty}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">{item.title}</h2>
          </div>
          
          <div className="flex items-center gap-3 bg-background border border-surfaceHighlight px-4 py-2 rounded-lg">
            <CalendarClock className="w-4 h-4 text-zinc-400" />
            <div className="flex items-center gap-2">
              <input 
                type="date"
                value={item.next_review_date ? new Date(item.next_review_date).toLocaleDateString('en-CA') : ''}
                onChange={(e) => setPendingSchedule({ problemId: item.problem_id, dateStr: e.target.value })}
                className="bg-zinc-800 text-zinc-200 border border-zinc-700 rounded px-2 py-1 outline-none text-sm cursor-pointer hover:bg-zinc-700 transition-colors"
              />
              <button 
                onClick={() => setPendingSchedule({ problemId: item.problem_id, dateStr: '' })}
                className="p-1.5 text-zinc-500 hover:text-error hover:bg-error/10 rounded transition-colors"
                title="Remove from Reviews"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Approaches */}
        <div className="p-6 space-y-8">
          {item.patterns && item.patterns.length > 0 ? (
            item.patterns.map((pattern: any, idx: number) => (
              <div key={idx} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Approach: {pattern.pattern_name}</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-background border border-surfaceHighlight rounded-lg p-4 h-full">
                    <h4 className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">Notes</h4>
                    {pattern.approach_notes ? (
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{pattern.approach_notes}</p>
                    ) : (
                      <p className="text-sm text-zinc-600 italic">No notes provided</p>
                    )}
                  </div>
                  
                  <div className="bg-background border border-surfaceHighlight rounded-lg overflow-hidden h-full">
                    <div className="bg-surfaceHighlight/50 px-4 py-2 border-b border-surfaceHighlight flex justify-between items-center">
                      <h4 className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Implementation</h4>
                      <span className="text-[10px] text-zinc-500 font-mono">{pattern.language}</span>
                    </div>
                    {pattern.code_snippet ? (
                      <SyntaxHighlighter 
                        language={pattern.language || "cpp"} 
                        style={vscDarkPlus}
                        customStyle={{ margin: 0, padding: '1rem', fontSize: '0.8rem', backgroundColor: 'transparent' }}
                      >
                        {pattern.code_snippet}
                      </SyntaxHighlighter>
                    ) : (
                      <div className="p-4 text-zinc-600 italic text-sm">No code provided</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-zinc-500 italic text-sm text-center py-4">No approaches saved for this problem.</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">Reviews</h1>
            <p className="text-zinc-400 mt-1">Manage your scheduled problems.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="space-y-12">
            {/* Due Section */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xl font-bold text-zinc-100">Due Reviews</h2>
                <span className="bg-error/20 text-error px-2 py-0.5 rounded-full text-xs font-bold">{due.length}</span>
              </div>
              
              {due.length === 0 ? (
                <div className="bg-surface/50 border border-surfaceHighlight border-dashed rounded-xl p-8 text-center text-zinc-500">
                  You have no problems due for review today!
                </div>
              ) : (
                <div className="space-y-6">
                  {due.map(renderProblemCard)}
                </div>
              )}
            </div>

            {/* Upcoming Section */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xl font-bold text-zinc-100">Upcoming</h2>
                <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs font-bold">{upcoming.length}</span>
              </div>
              
              {upcoming.length === 0 ? (
                <div className="bg-surface/50 border border-surfaceHighlight border-dashed rounded-xl p-8 text-center text-zinc-500">
                  No upcoming reviews scheduled.
                </div>
              ) : (
                <div className="space-y-6">
                  {upcoming.map(renderProblemCard)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Schedule Confirmation Modal */}
        {pendingSchedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface border border-surfaceHighlight rounded-xl shadow-2xl w-full max-w-md p-6">
              <h3 className="text-xl font-bold text-zinc-100 mb-4">Confirm Schedule Update</h3>
              <p className="text-zinc-400 mb-6">
                {pendingSchedule.dateStr 
                  ? `Are you sure you want to schedule this problem for ${new Date(pendingSchedule.dateStr).toLocaleDateString()}?` 
                  : 'Are you sure you want to remove this problem from your reviews?'}
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setPendingSchedule(null)}
                  className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmScheduleChange}
                  className="px-4 py-2 text-sm font-medium bg-primary text-zinc-900 rounded hover:bg-primary/90 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
