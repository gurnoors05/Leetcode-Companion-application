"use client";

import React, { useState } from 'react';
import { ExternalLink, Search, Filter, PenLine, Check, X, Loader2, NotebookPen, PenTool, LayoutDashboard } from 'lucide-react';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ExcalidrawWrapper from './ExcalidrawWrapper';
import GithubRepoModal from './GithubRepoModal';
import PushToGithubModal from './PushToGithubModal';
import { Code2 } from 'lucide-react';
import ProblemDetails from './ProblemDetails';
export interface PatternDetail {
  pattern_id?: number;
  name: string;
  approach_notes: string;
  code_snippet: string;
  language?: string;
  time_complexity: string;
  space_complexity: string;
  ai_reasoning: string;
  ai_time_complexity: string;
  ai_space_complexity: string;
  ai_verified: boolean;
  github_synced_url?: string;
}

export interface Problem {
  id: number;
  leetcode_number: number;
  title: string;
  leetcode_url: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: string;
  date_solved: string;
  patterns: string[];
  topic_tags: string[];
  pattern_details: PatternDetail[];
  ai_verified?: boolean;
  next_review_date?: string;
}

export default function DataTable({ data, jwt }: { data: Problem[], jwt: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  
  // Modals state
  const [activeNotesModal, setActiveNotesModal] = useState<number | null>(null); // problemId
  const [activeCanvasModal, setActiveCanvasModal] = useState<number | null>(null); // problemId
  
  // Track attempt history for expanded rows
  const [attemptHistories, setAttemptHistories] = useState<Record<number, any[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<number, boolean>>({});
  
  // Track edit state for notes inside modal: { [problemId_patternId]: "draft note content" }
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({});
  const [saveSuccess, setSaveSuccess] = useState<Record<string, boolean>>({});

  // Schedule confirmation state
  const [pendingSchedule, setPendingSchedule] = useState<{problemId: number, dateStr: string} | null>(null);

  // GitHub Sync state
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [syncingGithub, setSyncingGithub] = useState<Record<string, boolean>>({});
  const [activeProblemDetailsModal, setActiveProblemDetailsModal] = useState<number | null>(null);
  const [pendingSyncTask, setPendingSyncTask] = useState<{ problemId: number, patternId: number, folderName: string } | null>(null);

  // New Push Modal state
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [activePushProblemId, setActivePushProblemId] = useState<number | null>(null);

  const toggleRow = async (id: number) => {
    const isExpanding = !expandedRows[id];
    setExpandedRows(prev => ({ ...prev, [id]: isExpanding }));
    
    // Fetch attempt history when expanding a row
    if (isExpanding && !attemptHistories[id]) {
      setLoadingHistory(prev => ({ ...prev, [id]: true }));
      try {
        const problem = data.find(p => p.id === id);
        const lNum = problem?.leetcode_number;
        const res = await fetch(`/api/submission-attempts?leetcodeNumber=${lNum}`, {
          headers: { 'Authorization': `Bearer ${jwt}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAttemptHistories(prev => ({ ...prev, [id]: data.attempts || [] }));
        }
      } catch (e) {
        console.error("Failed to fetch attempt history", e);
      } finally {
        setLoadingHistory(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  const handleSaveNotes = async (problemId: number, patternId: number, currentDetailNames: string[]) => {
    const key = `${problemId}_${patternId}`;
    const newNotes = editingNotes[key];
    if (newNotes === undefined) return;
    
    setSavingNotes(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(`/api/problems/${problemId}/patterns/${patternId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({ approach_notes: newNotes })
      });
      
      if (res.ok) {
        setSaveSuccess(prev => ({ ...prev, [key]: true }));
        // Update local data optimistically
        const problem = data.find(p => p.id === problemId);
        if (problem) {
          problem.pattern_details.forEach(pd => {
            if (currentDetailNames.includes(pd.name)) {
              pd.approach_notes = newNotes;
            }
          });
        }
        setTimeout(() => {
          setSaveSuccess(prev => ({ ...prev, [key]: false }));
          setEditingNotes(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }, 1500);
      }
    } catch (e) {
      console.error("Failed to save notes", e);
    } finally {
      setSavingNotes(prev => ({ ...prev, [key]: false }));
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
        body: JSON.stringify({ date: dateStr || null })
      });
      if (res.ok) {
        window.location.reload(); // Quickest way to sync state for now
      } else {
        alert('Failed to update schedule');
      }
    } catch (e) {
      console.error(e);
      alert('Error updating schedule');
    }
  };

  const handlePushToGithub = async (problemId: number, patternId: number, folderName: string) => {
    const key = `${problemId}_${patternId}`;
    setSyncingGithub(prev => ({ ...prev, [key]: true }));

    try {
      const res = await fetch(`/api/problems/${problemId}/patterns/${patternId}/push-to-github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
        body: JSON.stringify({ customFolderName: folderName })
      });
      const result = await res.json();

      if (res.status === 400 && result.code === 'NO_REPO') {
        // Need to set up repo first
        setPendingSyncTask({ problemId, patternId, folderName });
        setIsGithubModalOpen(true);
        throw new Error('Please set up a GitHub repository first.');
      }

      if (res.ok) {
        // Update local state optimistically
        const problem = data.find(p => p.id === problemId);
        if (problem) {
          problem.pattern_details.forEach(pd => {
            if (pd.pattern_id === patternId) {
              pd.github_synced_url = result.url;
            }
          });
        }
        // Force re-render
        setSyncingGithub(prev => ({ ...prev }));
        // Resolve successfully - modal will show success state
      } else {
        throw new Error(result.error || 'Failed to push to GitHub');
      }
    } catch (e: any) {
      setSyncingGithub(prev => ({ ...prev, [key]: false }));
      throw e; // Re-throw so PushToGithubModal can display the error
    } finally {
      setSyncingGithub(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleRepoSetupSuccess = (repoName: string) => {
    setIsGithubModalOpen(false);
    if (pendingSyncTask) {
      handlePushToGithub(pendingSyncTask.problemId, pendingSyncTask.patternId, pendingSyncTask.folderName);
      setPendingSyncTask(null);
    }
  };

  const openPushModal = (problemId: number) => {
    setActivePushProblemId(problemId);
    setIsPushModalOpen(true);
  };

  const filteredData = data.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.patterns.some(pat => pat.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDifficulty = filterDifficulty === 'all' || p.difficulty === filterDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  const getDifficultyColor = (diff: string) => {
    switch(diff) {
      case 'easy': return 'text-success bg-success/10 border-success/20';
      case 'medium': return 'text-warning bg-warning/10 border-warning/20';
      case 'hard': return 'text-error bg-error/10 border-error/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const activeNotesProblem = data.find(p => p.id === activeNotesModal);

  return (
    <div className="flex flex-col gap-4">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-2">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search problems or patterns..." 
            className="glass-input w-full pl-10 py-2 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 items-center">
          <Filter className="w-4 h-4 text-gray-400" />
          <select 
            className="glass-input py-2 text-sm appearance-none pr-8 cursor-pointer"
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-surfaceHighlight rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="text-xs uppercase bg-surface border-b border-surfaceHighlight whitespace-nowrap text-zinc-500 font-semibold tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium tracking-wider">#</th>
                <th scope="col" className="px-6 py-4 font-medium tracking-wider min-w-[150px]">Title</th>
                <th scope="col" className="px-6 py-4 font-medium tracking-wider">Difficulty</th>
                <th scope="col" className="px-6 py-4 font-medium tracking-wider">Solved By</th>
                <th scope="col" className="px-6 py-4 font-medium tracking-wider">Also Solvable By</th>
                <th scope="col" className="px-6 py-4 font-medium tracking-wider">Mark for Review</th>
                <th scope="col" className="px-4 py-4 font-medium tracking-wider text-center">Notes</th>
                <th scope="col" className="px-4 py-4 font-medium tracking-wider text-center">Dry Run</th>
                <th scope="col" className="px-4 py-4 font-medium tracking-wider text-center">GitHub</th>
                <th scope="col" className="px-6 py-4 font-medium tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No problems found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredData.map((problem, idx) => (
                  <React.Fragment key={problem.id}>
                    <tr 
                      key={`tr-${problem.id}`} 
                      className={`
                        border-b border-surfaceHighlight transition-colors group cursor-pointer
                        ${activeProblemDetailsModal === problem.id ? 'bg-surfaceHighlight/30' : 'hover:bg-surfaceHighlight/30'}
                      `}
                      onClick={() => setActiveProblemDetailsModal(problem.id)}
                    >
                      <td className="px-6 py-4 font-mono text-zinc-500">
                        {problem.leetcode_number || '-'}
                      </td>
                      <td className="px-6 py-4 font-medium text-zinc-100">
                        {problem.title}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded text-[11px] font-semibold border whitespace-nowrap uppercase tracking-wider ${getDifficultyColor(problem.difficulty)}`}>
                          {problem.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {problem.patterns && problem.patterns.length > 0 ? (
                            <>
                              {problem.patterns.slice(0, 2).map(pat => (
                                <span key={pat} className="bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap">
                                  {pat}
                                </span>
                              ))}
                              {problem.patterns.length > 2 && (
                                <span className="bg-surfaceHighlight text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap" title="More Approaches">
                                  +{problem.patterns.length - 2} more
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-500 text-xs italic">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {(() => {
                            const alsoSolvable = (problem.topic_tags || []).filter(t => !problem.patterns.includes(t));
                            if (alsoSolvable.length === 0) return <span className="text-gray-500 text-xs italic">-</span>;
                            
                            return (
                              <>
                              {alsoSolvable.slice(0, 2).map(tag => (
                                  <span key={tag} className="border border-zinc-800 bg-surfaceHighlight text-zinc-400 px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap">
                                    {tag}
                                  </span>
                                ))}
                                {alsoSolvable.length > 2 && (
                                  <span className="border border-zinc-800 bg-surfaceHighlight/50 text-zinc-500 px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap">
                                    +{alsoSolvable.length - 2} more
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <input 
                            type="date"
                            onClick={(e) => e.stopPropagation()}
                            value={problem.next_review_date ? new Date(problem.next_review_date).toLocaleDateString('en-CA') : ''}
                            onChange={(e) => setPendingSchedule({ problemId: problem.id, dateStr: e.target.value })}
                            className="bg-zinc-800 text-zinc-200 border border-zinc-700 rounded px-2 py-1 text-xs outline-none cursor-pointer hover:bg-zinc-700 transition-colors"
                          />
                          {problem.next_review_date && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setPendingSchedule({ problemId: problem.id, dateStr: '' }); }}
                              className="ml-2 text-zinc-500 hover:text-red-400"
                              title="Clear Schedule"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      
                      {/* Notes Column */}
                      <td className="px-4 py-4 text-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveNotesModal(problem.id); }}
                          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors flex items-center justify-center mx-auto"
                          title="Edit Notes"
                        >
                          <NotebookPen className="w-4 h-4" />
                        </button>
                      </td>

                      {/* Dry Run Column */}
                      <td className="px-4 py-4 text-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveCanvasModal(problem.id); }}
                          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors flex items-center justify-center mx-auto"
                          title="Dry Run Canvas"
                        >
                          <PenTool className="w-4 h-4" />
                        </button>
                      </td>

                      {/* GitHub Column */}
                      <td className="px-4 py-4 text-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); openPushModal(problem.id); }}
                          className={`p-2 rounded-full transition-colors flex items-center justify-center mx-auto ${
                            problem.pattern_details?.some(pd => pd.github_synced_url) 
                              ? 'text-white bg-[#24292e] hover:bg-[#2f363d] shadow-sm'
                              : 'text-gray-400 hover:text-white hover:bg-white/10'
                          }`}
                          title={problem.pattern_details?.some(pd => pd.github_synced_url) ? "Synced to GitHub (Click to manage)" : "Push to GitHub"}
                        >
                          <Code2 className="w-4 h-4" />
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-4">
                          <button 
                            className="text-xs text-primary hover:text-white transition-colors"
                            onClick={(e) => { e.stopPropagation(); setActiveProblemDetailsModal(problem.id); }}
                          >
                            Details
                          </button>
                          <a 
                            href={problem.leetcode_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-xs hidden sm:inline">LeetCode</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Details Row */}
                    {expandedRows[problem.id] && (
                      <tr className="bg-black/50 border-b border-surfaceHighlight">
                        <td colSpan={9} className="p-0">
                          <div className="p-6 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="space-y-6">
                              {problem.pattern_details && problem.pattern_details.length > 0 ? (
                                (() => {
                                  // Group pattern details by code_snippet
                                  const grouped = problem.pattern_details.reduce((acc, detail) => {
                                    const key = detail.code_snippet || detail.name;
                                    if (!acc[key]) {
                                      acc[key] = { ...detail, names: [detail.name] };
                                    } else {
                                      acc[key].names.push(detail.name);
                                    }
                                    return acc;
                                  }, {} as Record<string, PatternDetail & { names: string[] }>);
                                  
                                  return Object.values(grouped).map((detail, dIdx) => (
                                    <div key={dIdx} className="bg-surface border border-surfaceHighlight rounded-lg p-5">
                                      <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                          <h4 className="text-zinc-100 font-semibold text-sm tracking-wide">
                                            Approach: {detail.names.join(', ')}
                                          </h4>
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Left Column: Notes & AI Reasoning */}
                                        <div className="space-y-4">
                                          
                                          {/* Read-Only Notes Section */}
                                          {detail.approach_notes && (
                                            <div>
                                              <h5 className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">Your Notes</h5>
                                              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap bg-background p-3 rounded-md border border-surfaceHighlight">
                                                {detail.approach_notes}
                                              </p>
                                            </div>
                                          )}
                                          
                                          {detail.ai_reasoning && (
                                            <div>
                                              <h5 className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-semibold flex items-center gap-1">
                                                ✨ AI Reasoning
                                              </h5>
                                              <p className="text-sm text-zinc-400 leading-relaxed bg-surfaceHighlight/30 p-3 rounded-md border border-surfaceHighlight">
                                                {detail.ai_reasoning}
                                              </p>
                                            </div>
                                          )}
                                          
                                          <div className="flex gap-4 pt-2">
                                            <div className="bg-background border border-surfaceHighlight px-3 py-2 rounded-md flex-1">
                                              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Time</p>
                                              <p className="font-mono text-sm text-zinc-300 mt-1">
                                                {detail.time_complexity || detail.ai_time_complexity || 'O(?)'}
                                              </p>
                                            </div>
                                            <div className="bg-background border border-surfaceHighlight px-3 py-2 rounded-md flex-1">
                                              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Space</p>
                                              <p className="font-mono text-sm text-zinc-300 mt-1">
                                                {detail.space_complexity || detail.ai_space_complexity || 'O(?)'}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Right Column: Code Snippet */}
                                        {detail.code_snippet && (
                                          <div className="flex flex-col">
                                            <h5 className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">Code</h5>
                                            <div className="flex-1 bg-background rounded-md border border-surfaceHighlight overflow-hidden">
                                              <SyntaxHighlighter 
                                                language={detail.language || "cpp"} 
                                                style={vscDarkPlus}
                                                customStyle={{ margin: 0, padding: '1rem', fontSize: '0.75rem', maxHeight: '300px' }}
                                              >
                                                {detail.code_snippet}
                                              </SyntaxHighlighter>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ));
                                })()
                              ) : (
                                <p className="text-sm text-zinc-500 text-center py-4">No detailed approaches logged.</p>
                              )}
                            </div>
                            
                            {/* Attempt History Section */}
                            <div className="mt-8 border-t border-surfaceHighlight pt-6">
                              <h4 className="text-zinc-100 font-semibold text-sm tracking-wide mb-4">Attempt History</h4>
                              {loadingHistory[problem.id] ? (
                                <div className="flex items-center gap-2 text-sm text-zinc-500">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Loading prior attempts...
                                </div>
                              ) : attemptHistories[problem.id] && attemptHistories[problem.id].length > 0 ? (
                                <div className="space-y-3">
                                  {attemptHistories[problem.id].map((attempt, aIdx) => (
                                    <div key={aIdx} className="bg-background border border-surfaceHighlight p-3 rounded-md flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                        <div>
                                          <p className="text-sm font-medium text-zinc-300">{attempt.status_msg}</p>
                                          <p className="text-[10px] text-zinc-500">{new Date(attempt.created_at).toLocaleString()}</p>
                                        </div>
                                      </div>
                                      <div>
                                        {attempt.mistake_category ? (
                                          <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-1 rounded border border-zinc-700">
                                            {attempt.mistake_category}
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-zinc-500 italic">Skipped categorization</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-zinc-500 bg-background p-4 rounded-md border border-surfaceHighlight text-center">
                                  No failed attempts recorded prior to solving this problem. Great job!
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALS --- */}

      {activeProblemDetailsModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <ProblemDetails 
            problemId={activeProblemDetailsModal} 
            onClose={() => setActiveProblemDetailsModal(null)} 
            className="w-full max-w-5xl h-[85vh]"
          />
        </div>
      )}

      {/* Notes Modal */}
      {activeNotesModal && activeNotesProblem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#121212] w-full max-w-3xl max-h-[85vh] flex flex-col border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
              <div>
                <h3 className="text-lg font-bold text-white">Notes: {activeNotesProblem.title}</h3>
                <p className="text-xs text-gray-400">Edit notes for individual approaches below</p>
              </div>
              <button 
                onClick={() => setActiveNotesModal(null)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {activeNotesProblem.pattern_details?.length > 0 ? (
                (() => {
                  const grouped = activeNotesProblem.pattern_details.reduce((acc, detail) => {
                    const key = detail.code_snippet || detail.name;
                    if (!acc[key]) {
                      acc[key] = { ...detail, names: [detail.name] };
                    } else {
                      acc[key].names.push(detail.name);
                    }
                    return acc;
                  }, {} as Record<string, PatternDetail & { names: string[] }>);
                  
                  return Object.values(grouped).map((detail, idx) => {
                    const pId = detail.pattern_id || 0; 
                    const noteKey = `${activeNotesProblem.id}_${pId}`;
                    const isEditing = editingNotes[noteKey] !== undefined;
                    const draftValue = editingNotes[noteKey] ?? detail.approach_notes;

                    return (
                      <div key={idx} className="bg-black/40 border border-white/5 rounded-lg p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-white font-medium text-sm">
                            Approach: <span className="text-primary">{detail.names.join(', ')}</span>
                          </h4>
                          <div className="flex items-center gap-2">
                            {saveSuccess[noteKey] && (
                              <span className="text-green-400 text-xs font-medium flex items-center gap-1 animate-in fade-in zoom-in duration-300">
                                <Check className="w-3 h-3" /> Saved!
                              </span>
                            )}
                            {pId !== 0 && !isEditing && (
                              <button 
                                onClick={() => setEditingNotes(prev => ({ ...prev, [noteKey]: detail.approach_notes || '' }))}
                                className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-xs px-2 py-1 bg-white/5 hover:bg-white/10 rounded"
                              >
                                <PenLine className="w-3 h-3" /> Edit
                              </button>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="space-y-3 animate-in fade-in duration-200">
                            <textarea 
                              value={draftValue}
                              onChange={(e) => setEditingNotes(prev => ({ ...prev, [noteKey]: e.target.value }))}
                              placeholder="Write your study notes for this approach here..."
                              className="w-full bg-black/60 text-sm text-gray-200 border border-white/20 rounded-md p-3 outline-none focus:border-primary/50 min-h-[120px] transition-colors"
                            />
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => setEditingNotes(prev => { const n = {...prev}; delete n[noteKey]; return n; })}
                                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={() => handleSaveNotes(activeNotesProblem.id, pId, detail.names)}
                                disabled={savingNotes[noteKey]}
                                className="px-4 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded transition-colors flex items-center gap-2 disabled:opacity-50"
                              >
                                {savingNotes[noteKey] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                Save Notes
                              </button>
                            </div>
                          </div>
                        ) : (
                          detail.approach_notes ? (
                            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap bg-white/5 p-4 rounded-md border border-white/5">
                              {detail.approach_notes}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500 italic bg-white/5 p-4 rounded-md border border-white/5 flex items-center justify-center h-[80px]">
                              No notes provided for this approach yet.
                            </p>
                          )
                        )}
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-gray-500 space-y-2">
                  <LayoutDashboard className="w-8 h-8 opacity-20" />
                  <p>No approaches logged for this problem.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Excalidraw Canvas Modal */}
      {activeCanvasModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#121212] w-full max-w-[1400px] h-full sm:h-[90vh] flex flex-col border border-white/10 rounded-xl shadow-2xl overflow-hidden relative">
            <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <PenTool className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-sm font-bold text-white">Dry Run Canvas</h3>
              </div>
              <button 
                onClick={() => setActiveCanvasModal(null)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Render Canvas Wrapper in the Modal Body */}
            <div className="flex-1 w-full relative">
              <ExcalidrawWrapper problemId={activeCanvasModal} onClose={() => setActiveCanvasModal(null)} />
            </div>
          </div>
        </div>
      )}

      {/* GitHub Repo Setup Modal */}
      <GithubRepoModal 
        isOpen={isGithubModalOpen} 
        onClose={() => setIsGithubModalOpen(false)} 
        onSuccess={handleRepoSetupSuccess} 
      />

      {/* Push to GitHub Modal */}
      <PushToGithubModal
        isOpen={isPushModalOpen}
        onClose={() => { setIsPushModalOpen(false); setActivePushProblemId(null); }}
        onPush={async (patternId, folderName) => {
          if (activePushProblemId) {
            await handlePushToGithub(activePushProblemId, patternId, folderName);
          }
        }}
        problemTitle={activePushProblemId ? data.find(p => p.id === activePushProblemId)?.title || '' : ''}
        patterns={activePushProblemId ? (data.find(p => p.id === activePushProblemId)?.pattern_details?.map(pd => ({ pattern_id: pd.pattern_id, name: pd.name, github_synced_url: pd.github_synced_url })) || []) : []}
      />

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
  );
}
