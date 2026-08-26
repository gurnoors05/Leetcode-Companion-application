import React, { useState, useEffect } from 'react';
import { Code2, Loader2, X, ChevronDown, FolderOpen, ExternalLink, Check } from 'lucide-react';

interface PatternOption {
  pattern_id?: number;
  name?: string;
  pattern_name?: string;
  github_synced_url?: string;
}

interface PushToGithubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPush: (patternId: number, folderName: string) => Promise<void>;
  patterns: PatternOption[];
  problemTitle: string;
}

export default function PushToGithubModal({ isOpen, onClose, onPush, patterns, problemTitle }: PushToGithubModalProps) {
  const [selectedPatternId, setSelectedPatternId] = useState<number | ''>('');
  const [folderName, setFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [existingFolders, setExistingFolders] = useState<string[]>([]);
  const [isFetchingFolders, setIsFetchingFolders] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (patterns.length > 0) {
        setSelectedPatternId(patterns[0].pattern_id || '');
        setFolderName(patterns[0].name || patterns[0].pattern_name || '');
      } else {
        setSelectedPatternId('');
        setFolderName('uncategorized');
      }
      setError('');
      setIsLoading(false);
      setIsSuccess(false);
      fetchFolders();
    }
  }, [isOpen, patterns]);

  const fetchFolders = async () => {
    setIsFetchingFolders(true);
    try {
      const res = await fetch('/api/github/folders');
      if (res.ok) {
        const data = await res.json();
        if (data.folders) {
          setExistingFolders(data.folders);
        }
      }
    } catch (e) {
      console.error('Failed to fetch folders', e);
    } finally {
      setIsFetchingFolders(false);
    }
  };

  const handlePatternChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value, 10);
    setSelectedPatternId(val);
    const selectedPattern = patterns.find(p => p.pattern_id === val);
    if (selectedPattern) {
      setFolderName(selectedPattern.name || selectedPattern.pattern_name || '');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPatternId === '') {
      setError('Please select an approach to push.');
      return;
    }
    if (!folderName.trim()) {
      setError('Folder name cannot be empty.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onPush(selectedPatternId as number, folderName);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to push to GitHub');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 text-white">
            <Code2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Push to GitHub</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-medium text-white mb-1 truncate" title={problemTitle}>{problemTitle}</h3>
          <p className="text-xs text-gray-400">
            Select which approach to push and what folder it should be organized under.
          </p>
        </div>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-6 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Successfully Pushed!</h3>
            <p className="text-sm text-gray-400 text-center mb-6">
              Your solution has been pushed to your GitHub repository under <span className="text-white font-mono bg-white/10 px-1 rounded">{folderName}</span>.
            </p>
            <button
              onClick={() => {
                setIsSuccess(false);
                onClose();
              }}
              className="w-full px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/10 text-white hover:bg-white/20 transition-all"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Approach Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Select Approach
            </label>
            <div className="relative">
              <select
                value={selectedPatternId}
                onChange={handlePatternChange}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm appearance-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                required
              >
                {patterns.length === 0 && <option value="">No approaches found</option>}
                {patterns.map(p => (
                  <option key={p.pattern_id} value={p.pattern_id}>
                    {p.name || p.pattern_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {patterns.find(p => p.pattern_id === selectedPatternId)?.github_synced_url && (
              <div className="mt-2 flex items-center justify-between bg-green-500/10 border border-green-500/20 p-2.5 rounded-lg">
                <span className="text-xs font-medium text-green-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Already Synced
                </span>
                <a 
                  href={patterns.find(p => p.pattern_id === selectedPatternId)?.github_synced_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium bg-[#24292e] text-white px-2 py-1 rounded hover:bg-[#2f363d] transition-colors flex items-center gap-1"
                >
                  View <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Folder Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Target Folder / Tag
            </label>
            <div className="relative">
              <FolderOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                required
                className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                placeholder={isFetchingFolders ? "Loading folders..." : "e.g. two-pointers"}
                value={folderName}
                onChange={(e) => {
                  setFolderName(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
              />
              {isDropdownOpen && existingFolders.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                  {existingFolders
                    .filter(f => f.toLowerCase().includes((folderName || '').toLowerCase()))
                    .map(folder => (
                      <div
                        key={folder}
                        className="px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white cursor-pointer"
                        onClick={() => {
                          setFolderName(folder);
                          setIsDropdownOpen(false);
                        }}
                      >
                        {folder}
                      </div>
                    ))}
                </div>
              )}
            </div>
            <p className="mt-2 text-[10px] text-gray-500">
              The file will be saved under <span className="font-mono text-gray-400 bg-white/5 px-1 rounded">{(folderName || '').toLowerCase().replace(/\s+/g, '-')}</span>/
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || patterns.length === 0}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-zinc-900 hover:bg-primary/90 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Pushing...
                </>
              ) : (
                <>
                  <Code2 className="w-4 h-4" />
                  {patterns.find(p => p.pattern_id === selectedPatternId)?.github_synced_url ? 'Push Update' : 'Push to GitHub'}
                </>
              )}
            </button>
          </div>
          </form>
          </>
        )}
      </div>
    </div>
  );
}
