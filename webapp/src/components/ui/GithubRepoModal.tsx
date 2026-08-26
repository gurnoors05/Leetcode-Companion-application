import React, { useState } from 'react';
import { Code2, Loader2, X, Info, Check } from 'lucide-react';

interface GithubRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (repoName: string) => void;
}

export default function GithubRepoModal({ isOpen, onClose, onSuccess }: GithubRepoModalProps) {
  const [isNew, setIsNew] = useState(true);
  const [repoName, setRepoName] = useState('leetcode-companion-solutions');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdRepoName, setCreatedRepoName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/github/setup-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoName, isNew })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to setup repo');
      
      setCreatedRepoName(data.repo);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setIsSuccess(false);
    onSuccess(createdRepoName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 text-white">
            <Code2 className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">GitHub Sync Setup</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-6 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Repository Ready!</h3>
            <p className="text-sm text-gray-400 text-center mb-6">
              Your repository <span className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded">{createdRepoName}</span> has been {isNew ? 'created' : 'linked'} successfully.
            </p>
            <button
              onClick={handleSuccessClose}
              className="w-full px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-zinc-900 hover:bg-primary/90 transition-all"
            >
              Continue
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-6">
              To sync your solutions, please specify a GitHub repository. We will automatically organize your code into folders by pattern.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex bg-white/5 rounded-xl p-1 gap-1">
                <button
                  type="button"
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${isNew ? 'bg-primary text-zinc-900 shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  onClick={() => setIsNew(true)}
                >
                  Create New Repo
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${!isNew ? 'bg-primary text-zinc-900 shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  onClick={() => setIsNew(false)}
                >
                  Use Existing Repo
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {isNew ? 'Repository Name' : 'Repository Name (e.g. username/repo)'}
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  placeholder={isNew ? "leetcode-companion-solutions" : "octocat/my-solutions"}
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                />
                {isNew && (
                  <p className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <Info className="w-4 h-4 shrink-0" /> This will create a public repository on your account.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-zinc-900 hover:bg-primary/90 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isNew ? 'Create & Save' : 'Verify & Save'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
