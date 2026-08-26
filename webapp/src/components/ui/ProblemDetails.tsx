import React, { useState, useEffect } from 'react';
import { Loader2, X, Brain, Save, Check, Code2, AlignLeft, CalendarClock, ExternalLink, NotebookPen, Calendar, Globe, Lock, Link2, Copy } from 'lucide-react';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ExcalidrawWrapper from './ExcalidrawWrapper';
import GithubRepoModal from './GithubRepoModal';
import PushToGithubModal from './PushToGithubModal';

interface ProblemDetailsProps {
  problemId: string | number;
  onClose?: () => void;
  className?: string;
}

export default function ProblemDetails({ problemId, onClose, className = '' }: ProblemDetailsProps) {
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<any>(null);
  
  // Edit states
  const [editingNotes, setEditingNotes] = useState<Record<number, boolean>>({});
  const [editNotesText, setEditNotesText] = useState<Record<number, string>>({});
  const [editingCode, setEditingCode] = useState<Record<number, boolean>>({});
  const [editCodeText, setEditCodeText] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saveSuccess, setSaveSuccess] = useState<Record<string, boolean>>({});

  // Modals state
  const [activeCanvasModal, setActiveCanvasModal] = useState<number | null>(null);
  

  // GitHub Sync state
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [syncingGithub, setSyncingGithub] = useState<Record<string, boolean>>({});
  const [pendingSyncTask, setPendingSyncTask] = useState<{ problemId: number, patternId: number, folderName: string } | null>(null);

  useEffect(() => {
    if (!problemId) return;
    fetchProblemDetails();
  }, [problemId]);

  const fetchProblemDetails = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch(`/api/problems/${problemId}`);
      if (res.ok) {
        const data = await res.json();
        setProblem(data);
      } else {
        console.error('Failed to fetch problem');
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const handleSave = async (patternId: number, field: 'approach_notes' | 'code_snippet', value: string) => {
    const key = `${patternId}_${field}`;
    setSaving(prev => ({ ...prev, [key]: true }));
    
    try {
      const res = await fetch(`/api/problems/${problemId}/patterns/${patternId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      
      if (res.ok) {
        setSaveSuccess(prev => ({ ...prev, [key]: true }));
        // Update local state to reflect changes
        setProblem((prev: any) => ({
          ...prev,
          patterns: prev.patterns.map((p: any) => 
            p.pattern_id === patternId ? { ...p, [field]: value } : p
          )
        }));
        
        setTimeout(() => {
          setSaveSuccess(prev => ({ ...prev, [key]: false }));
          if (field === 'approach_notes') setEditingNotes(prev => ({ ...prev, [patternId]: false }));
          if (field === 'code_snippet') setEditingCode(prev => ({ ...prev, [patternId]: false }));
        }, 1500);
      }
    } catch (e) {
      console.error('Failed to save', e);
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleVisibilityChange = async (patternId: number, visibility: string) => {
    try {
      const res = await fetch(`/api/problems/${problemId}/patterns/${patternId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility })
      });
      
      if (res.ok) {
        const data = await res.json();
        setProblem((prev: any) => ({
          ...prev,
          patterns: prev.patterns.map((p: any) => 
            p.pattern_id === patternId 
              ? { ...p, visibility: data.data.visibility, share_token: data.data.share_token } 
              : p
          )
        }));
      }
    } catch (e) {
      console.error('Failed to change visibility', e);
    }
  };

  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(url);
    // Could add a toast here
  };


  const handleScheduleChange = async (probId: number, dateStr: string) => {
    try {
      const res = await fetch(`/api/problems/${probId}/review-schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr || null })
      });
      if (res.ok) {
        fetchProblemDetails(false); // Refresh details silently
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePushToGithub = async (patternId: number, folderName: string) => {
    const key = `${problemId}_${patternId}`;
    setSyncingGithub(prev => ({ ...prev, [key]: true }));

    try {
      const res = await fetch(`/api/github-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId: Number(problemId), patternId, customFolderName: folderName })
      });
      
      let result;
      try {
        result = await res.json();
      } catch (e) {
        throw new Error('Server returned an invalid response (not JSON). Please try again in a few seconds.');
      }

      if (res.status === 400 && result.code === 'NO_REPO') {
        setPendingSyncTask({ problemId: Number(problemId), patternId, folderName });
        setIsGithubModalOpen(true);
        // Throw an error so the push modal doesn't show success yet
        throw new Error('GitHub repository not configured. Please link a repository.');
      }

      if (res.ok) {
        await fetchProblemDetails(false); // Refresh silently to get synced URL
      } else {
        throw new Error(result.error || 'Failed to push to GitHub');
      }
    } catch (e: any) {
      console.error(e);
      // Propagate the error so the PushToGithubModal can display it and prevent success state
      throw e;
    } finally {
      setSyncingGithub(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleRepoSetupSuccess = (repoName: string) => {
    setIsGithubModalOpen(false);
    if (pendingSyncTask) {
      handlePushToGithub(pendingSyncTask.patternId, pendingSyncTask.folderName);
      setPendingSyncTask(null);
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
      <div className={`flex flex-col h-full bg-surface border border-surfaceHighlight rounded-xl items-center justify-center ${className}`}>
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className={`flex flex-col h-full bg-surface border border-surfaceHighlight rounded-xl items-center justify-center text-zinc-500 ${className}`}>
        Problem not found.
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-surface/95 backdrop-blur border border-surfaceHighlight rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-right-8 fade-in duration-300 ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-surfaceHighlight bg-surfaceHighlight/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-mono text-zinc-400 bg-black/40 px-2.5 py-1 rounded-md border border-zinc-800">
                #{problem.leetcode_number || '?'}
              </span>
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getDifficultyColor(problem.difficulty)}`}>
                {problem.difficulty}
              </span>
              {problem.next_review_date && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  <CalendarClock className="w-3 h-3" />
                  Review: {new Date(problem.next_review_date).toLocaleDateString('en-CA')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-zinc-100">{problem.title}</h2>
              {problem.leetcode_url && (
                <a 
                  href={problem.leetcode_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-1.5 hover:bg-surfaceHighlight rounded-lg text-zinc-400 hover:text-white transition-colors"
                  title="Open on LeetCode"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            
            
            {/* Quick Actions */}
            {problem.is_owner && (
              <div className="flex items-center gap-3 mt-4">
                <button 
                  onClick={() => setActiveCanvasModal(problem.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surfaceHighlight/50 hover:bg-surfaceHighlight text-xs font-semibold text-zinc-300 transition-colors"
                >
                  <NotebookPen className="w-3.5 h-3.5 text-primary" />
                  Dry Run
                </button>
                
                <button 
                  onClick={() => setIsPushModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surfaceHighlight/50 hover:bg-surfaceHighlight text-xs font-semibold text-zinc-300 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  Push to GitHub
                </button>
                
                <div className="relative flex items-center">
                    <label className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surfaceHighlight/50 hover:bg-surfaceHighlight text-xs font-semibold text-zinc-300 transition-colors cursor-pointer group">
                      <Calendar className="w-3.5 h-3.5 text-warning group-hover:scale-110 transition-transform" />
                      {problem.next_review_date ? `Review: ${new Date(problem.next_review_date).toLocaleDateString('en-CA')}` : 'Mark Review'}
                      <input 
                        type="date"
                        onClick={(e) => {
                          try {
                            // @ts-ignore - showPicker is available in modern browsers
                            e.currentTarget.showPicker();
                          } catch(err) {}
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        value={problem.next_review_date ? new Date(problem.next_review_date).toLocaleDateString('en-CA') : ''}
                        onChange={(e) => handleScheduleChange(problem.id, e.target.value)}
                      />
                    </label>
                </div>
              </div>
            )}
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-surfaceHighlight rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8 bg-black/20">
        {problem.patterns && problem.patterns.length > 0 ? (
          problem.patterns.map((pattern: any, idx: number) => (
            <div key={pattern.pattern_id} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-surfaceHighlight/50">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wide">
                    {pattern.pattern_name}
                  </h3>
                  {problem.is_owner && (
                    <div className="ml-4 flex items-center bg-zinc-900 rounded border border-zinc-800">
                      <select 
                        value={pattern.visibility || 'PRIVATE'} 
                        onChange={(e) => handleVisibilityChange(pattern.pattern_id, e.target.value)}
                        className="bg-transparent text-[10px] uppercase font-bold text-zinc-400 py-1 pl-2 pr-6 appearance-none focus:outline-none cursor-pointer"
                      >
                        <option value="PRIVATE">Private</option>
                        <option value="UNLISTED">Unlisted</option>
                        <option value="PUBLIC">Public</option>
                      </select>
                      <div className="pointer-events-none pr-2 -ml-4">
                        {(!pattern.visibility || pattern.visibility === 'PRIVATE') && <Lock className="w-3 h-3 text-zinc-500" />}
                        {pattern.visibility === 'UNLISTED' && <Link2 className="w-3 h-3 text-warning" />}
                        {pattern.visibility === 'PUBLIC' && <Globe className="w-3 h-3 text-success" />}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Complexities */}
                <div className="flex gap-4">
                  {(pattern.time_complexity || pattern.ai_time_complexity) && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">T.C.</span>
                      <span className="text-xs font-mono text-warning bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20">
                        {pattern.time_complexity || pattern.ai_time_complexity}
                      </span>
                    </div>
                  )}
                  {(pattern.space_complexity || pattern.ai_space_complexity) && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">S.C.</span>
                      <span className="text-xs font-mono text-error bg-error/10 px-1.5 py-0.5 rounded border border-error/20">
                        {pattern.space_complexity || pattern.ai_space_complexity}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Share Link for UNLISTED */}
              {problem.is_owner && pattern.visibility === 'UNLISTED' && pattern.share_token && (
                <div className="flex items-center gap-2 bg-warning/5 border border-warning/20 p-2.5 rounded-lg">
                  <Link2 className="w-4 h-4 text-warning shrink-0" />
                  <div className="flex-1 truncate text-xs text-zinc-400">
                    <span className="text-zinc-300 font-medium mr-2">Share Link:</span>
                    {`${window.location.origin}/shared/${pattern.share_token}`}
                  </div>
                  <button 
                    onClick={() => copyShareLink(pattern.share_token)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-warning/10 hover:bg-warning/20 text-warning text-xs font-semibold rounded transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
              )}

              {/* AI Reasoning Summary if it exists */}
              {pattern.ai_reasoning ? (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-zinc-300 flex items-start gap-2">
                  <Brain className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-primary text-xs uppercase tracking-wide mb-1 block">AI Summary</span>
                    {pattern.ai_reasoning}
                  </div>
                </div>
              ) : pattern.code_snippet ? (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-zinc-300 flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0"></div>
                  <span className="text-xs text-primary font-medium tracking-wide">Generating AI analysis... (Refresh in a few seconds)</span>
                </div>
              ) : null}
              {/* Complexities */}
              <div className="flex items-center gap-4 text-sm">
                <div className="bg-black/40 border border-white/5 rounded-lg px-4 py-2 flex items-center gap-3 w-max">
                  <span className="font-mono text-zinc-400">Time:</span>
                  <span className="font-semibold text-primary">{pattern.time_complexity || pattern.ai_time_complexity || 'O(?)'}</span>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-lg px-4 py-2 flex items-center gap-3 w-max">
                  <span className="font-mono text-zinc-400">Space:</span>
                  <span className="font-semibold text-primary">{pattern.space_complexity || pattern.ai_space_complexity || 'O(?)'}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Notes Section */}
                <div className="bg-background border border-surfaceHighlight rounded-xl overflow-hidden flex flex-col min-h-[300px]">
                  <div className="bg-surfaceHighlight/30 px-4 py-3 border-b border-surfaceHighlight flex justify-between items-center">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <AlignLeft className="w-4 h-4" />
                      <h4 className="text-[11px] uppercase tracking-wider font-bold">Approach Notes</h4>
                    </div>
                    {editingNotes[pattern.pattern_id] ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setEditingNotes(prev => ({ ...prev, [pattern.pattern_id]: false }))}
                          className="px-3 py-1 text-xs text-zinc-400 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleSave(pattern.pattern_id, 'approach_notes', editNotesText[pattern.pattern_id] || '')}
                          disabled={saving[`${pattern.pattern_id}_approach_notes`]}
                          className="flex items-center gap-1.5 bg-primary text-zinc-900 px-3 py-1 rounded text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {saving[`${pattern.pattern_id}_approach_notes`] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 
                           saveSuccess[`${pattern.pattern_id}_approach_notes`] ? <Check className="w-3.5 h-3.5" /> : 
                           <Save className="w-3.5 h-3.5" />}
                          Save
                        </button>
                      </div>
                    ) : problem.is_owner ? (
                      <button 
                        onClick={() => {
                          setEditNotesText(prev => ({ ...prev, [pattern.pattern_id]: pattern.approach_notes || '' }));
                          setEditingNotes(prev => ({ ...prev, [pattern.pattern_id]: true }));
                        }}
                        className="px-3 py-1 text-xs text-zinc-400 hover:text-white bg-surfaceHighlight/50 hover:bg-surfaceHighlight rounded transition-colors"
                      >
                        Edit
                      </button>
                    ) : null}
                  </div>
                  <div className="flex-1 p-4">
                    {editingNotes[pattern.pattern_id] ? (
                      <textarea 
                        value={editNotesText[pattern.pattern_id] ?? ''}
                        onChange={(e) => setEditNotesText(prev => ({ ...prev, [pattern.pattern_id]: e.target.value }))}
                        className="w-full h-full min-h-[200px] bg-zinc-900 text-zinc-300 border border-zinc-700 rounded-md p-3 text-sm focus:outline-none focus:border-primary/50 resize-y"
                        placeholder="Explain the intuition behind this approach..."
                      />
                    ) : pattern.approach_notes ? (
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{pattern.approach_notes}</p>
                    ) : (
                      <div className="flex items-center justify-center h-full text-zinc-600 italic text-sm">
                        No notes provided
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Code Section */}
                <div className="bg-background border border-surfaceHighlight rounded-xl overflow-hidden flex flex-col min-h-[300px]">
                  <div className="bg-surfaceHighlight/30 px-4 py-3 border-b border-surfaceHighlight flex justify-between items-center">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Code2 className="w-4 h-4" />
                      <h4 className="text-[11px] uppercase tracking-wider font-bold">Implementation</h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 font-mono ml-2">{pattern.language}</span>
                    </div>
                    {editingCode[pattern.pattern_id] ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setEditingCode(prev => ({ ...prev, [pattern.pattern_id]: false }))}
                          className="px-3 py-1 text-xs text-zinc-400 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleSave(pattern.pattern_id, 'code_snippet', editCodeText[pattern.pattern_id] || '')}
                          disabled={saving[`${pattern.pattern_id}_code_snippet`]}
                          className="flex items-center gap-1.5 bg-primary text-zinc-900 px-3 py-1 rounded text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {saving[`${pattern.pattern_id}_code_snippet`] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 
                           saveSuccess[`${pattern.pattern_id}_code_snippet`] ? <Check className="w-3.5 h-3.5" /> : 
                           <Save className="w-3.5 h-3.5" />}
                          Save
                        </button>
                      </div>
                    ) : problem.is_owner ? (
                      <button 
                        onClick={() => {
                          setEditCodeText(prev => ({ ...prev, [pattern.pattern_id]: pattern.code_snippet || '' }));
                          setEditingCode(prev => ({ ...prev, [pattern.pattern_id]: true }));
                        }}
                        className="px-3 py-1 text-xs text-zinc-400 hover:text-white bg-surfaceHighlight/50 hover:bg-surfaceHighlight rounded transition-colors"
                      >
                        Edit
                      </button>
                    ) : null}
                  </div>
                  <div className="flex-1">
                    {editingCode[pattern.pattern_id] ? (
                      <div className="p-4 h-full">
                        <textarea 
                          value={editCodeText[pattern.pattern_id] ?? ''}
                          onChange={(e) => setEditCodeText(prev => ({ ...prev, [pattern.pattern_id]: e.target.value }))}
                          className="w-full h-full min-h-[200px] bg-zinc-900 text-zinc-300 border border-zinc-700 rounded-md p-3 text-sm font-mono focus:outline-none focus:border-primary/50 resize-y"
                          placeholder="Paste your implementation here..."
                        />
                      </div>
                    ) : pattern.code_snippet ? (
                      <div className="h-full">
                        <SyntaxHighlighter 
                          language={pattern.language || "cpp"} 
                          style={vscDarkPlus}
                          customStyle={{ margin: 0, padding: '1.5rem', fontSize: '0.85rem', backgroundColor: 'transparent', height: '100%' }}
                        >
                          {pattern.code_snippet}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-zinc-600 italic text-sm p-4">
                        No code provided
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-zinc-500 italic text-sm py-12">
            No approaches have been saved for this problem yet.
          </div>
        )}
      </div>

      {/* Excalidraw Canvas Modal */}
      {activeCanvasModal && (
        <ExcalidrawWrapper 
          problemId={activeCanvasModal} 
          onClose={() => setActiveCanvasModal(null)} 
        />
      )}

      {/* GitHub Modals */}
      <PushToGithubModal 
        isOpen={isPushModalOpen}
        onClose={() => setIsPushModalOpen(false)}
        onPush={handlePushToGithub}
        patterns={problem.patterns}
        problemTitle={problem.title}
      />
      
      <GithubRepoModal 
        isOpen={isGithubModalOpen}
        onClose={() => setIsGithubModalOpen(false)}
        onSuccess={handleRepoSetupSuccess}
      />
    </div>
  );
}
