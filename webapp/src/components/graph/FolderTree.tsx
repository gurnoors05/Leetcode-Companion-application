import React, { useState } from 'react';
import { Folder, FolderOpen, FileCode, ChevronRight, ChevronDown } from 'lucide-react';

export interface FolderTreeProps {
  patterns: any[];
  problems: any[];
  links: any[];
  onProblemClick: (problem: any) => void;
  onPatternClick: (pattern: any) => void;
}

export default function FolderTree({ patterns, problems, links, onProblemClick, onPatternClick }: FolderTreeProps) {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (patternId: string) => {
    setOpenFolders(prev => {
      const next = new Set(prev);
      if (next.has(patternId)) {
        next.delete(patternId);
      } else {
        next.add(patternId);
      }
      return next;
    });
  };

  const getDifficultyColor = (diff: string) => {
    switch(diff) {
      case 'easy': return 'text-success';
      case 'medium': return 'text-warning';
      case 'hard': return 'text-error';
      default: return 'text-zinc-500';
    }
  };

  // Group problems by pattern
  const folders = patterns.map(pat => {
    const associatedProblemIds = links.filter(l => l.source === pat.id).map(l => l.target);
    const associatedProblems = problems.filter(p => associatedProblemIds.includes(p.id));
    return {
      ...pat,
      children: associatedProblems
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="w-full h-full overflow-y-auto bg-surface border-r border-surfaceHighlight p-4 custom-scrollbar">
      <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider mb-4 px-2">Knowledge Base</h2>
      <div className="space-y-1">
        {folders.map(folder => {
          const isOpen = openFolders.has(folder.id);
          return (
            <div key={folder.id} className="flex flex-col">
              <button
                onClick={() => {
                  toggleFolder(folder.id);
                  onPatternClick(folder);
                }}
                className="flex items-center gap-2 px-2 py-1.5 w-full text-left rounded-md hover:bg-surfaceHighlight/50 text-zinc-300 transition-colors group"
              >
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                )}
                {isOpen ? (
                  <FolderOpen className="w-4 h-4 text-primary" />
                ) : (
                  <Folder className="w-4 h-4 text-primary" />
                )}
                <span className="text-sm font-medium truncate">{folder.name}</span>
                <span className="ml-auto text-[10px] text-zinc-500 font-mono bg-zinc-800 px-1.5 py-0.5 rounded group-hover:bg-zinc-700 transition-colors">
                  {folder.children.length}
                </span>
              </button>

              {isOpen && (
                <div className="pl-6 space-y-0.5 mt-0.5 mb-1 animate-in slide-in-from-top-1 fade-in duration-200">
                  {folder.children.map((prob: any) => (
                    <button
                      key={prob.id}
                      onClick={() => onProblemClick(prob)}
                      className="flex items-center gap-2 px-2 py-1.5 w-full text-left rounded-md hover:bg-surfaceHighlight/50 text-zinc-400 transition-colors"
                      title={prob.title}
                    >
                      <FileCode className={`w-3.5 h-3.5 ${getDifficultyColor(prob.difficulty)}`} />
                      <span className="text-[13px] truncate">{prob.title}</span>
                    </button>
                  ))}
                  {folder.children.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-zinc-600 italic">Empty</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
