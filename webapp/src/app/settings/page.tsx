"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Save, Loader2, Check } from 'lucide-react';

export default function SettingsPage() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsername();
  }, []);

  const fetchUsername = async () => {
    try {
      const res = await fetch('/api/settings/leetcode-username');
      if (res.ok) {
        const data = await res.json();
        setUsername(data.leetcode_username || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    
    try {
      const res = await fetch('/api/settings/leetcode-username', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leetcode_username: username })
      });
      
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        setError('Failed to save settings.');
      }
    } catch (e) {
      setError('An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300 pt-8">
      <div className="flex items-center gap-4 border-b border-surfaceHighlight pb-6">
        <div className="w-12 h-12 bg-surfaceHighlight/50 rounded-xl flex items-center justify-center">
          <Settings className="w-6 h-6 text-zinc-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Settings</h1>
          <p className="text-sm text-zinc-400">Manage your LeetCode connections and preferences.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-surface border border-surfaceHighlight rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-1">LeetCode Profile</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Connect your public LeetCode profile to fetch your full activity history and heatmap.
          </p>
          
          <div className="space-y-2 max-w-md">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
              LeetCode Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. username"
              className="w-full bg-black/50 border border-surfaceHighlight rounded-xl px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
            />
          </div>
          {error && <p className="text-error text-sm mt-2">{error}</p>}
        </div>

        <div className="pt-4 border-t border-surfaceHighlight flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-zinc-900 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 
             saveSuccess ? <Check className="w-4 h-4" /> : 
             <Save className="w-4 h-4" />}
            {saveSuccess ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
