"use client";

import React, { useState, useEffect } from 'react';
import { AlertCircle, Filter, Loader2, Calendar } from 'lucide-react';

const CATEGORIES = [
  'All Categories',
  'Wrong approach',
  'Missed edge case',
  'Time/Memory limit',
  'Silly bug',
  'Skipped'
];

interface Mistake {
  id: number;
  leetcode_number: number;
  title: string;
  difficulty: string;
  status_msg: string;
  mistake_category: string | null;
  created_at: string;
}

export default function MistakeLogTable({ jwt }: { jwt: string }) {
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('All Categories');

  useEffect(() => {
    fetchMistakes();
  }, [filterCategory]);

  const fetchMistakes = async () => {
    setLoading(true);
    try {
      const url = new URL(`${window.location.origin}/api/mistakes`);
      if (filterCategory !== 'All Categories') {
        const queryCategory = filterCategory === 'Skipped' ? '' : filterCategory;
        // In the API, if category query param exists, it filters. 
        // We need a way to filter "Skipped" (where mistake_category IS NULL).
        // For now, let's fetch all and filter in frontend to avoid complex query building just for IS NULL.
      }
      
      const res = await fetch('/api/mistakes', {
        headers: {
          'Authorization': `Bearer ${jwt}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMistakes(data.mistakes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredMistakes = mistakes.filter(m => {
    if (filterCategory === 'All Categories') return true;
    if (filterCategory === 'Skipped') return !m.mistake_category;
    return m.mistake_category === filterCategory;
  });

  const getDifficultyColor = (diff: string) => {
    switch(diff?.toLowerCase()) {
      case 'easy': return 'text-success bg-success/10 border-success/20';
      case 'medium': return 'text-warning bg-warning/10 border-warning/20';
      case 'hard': return 'text-error bg-error/10 border-error/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getCategoryColor = (cat: string | null) => {
    switch(cat) {
      case 'Wrong approach': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'Missed edge case': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'Time/Memory limit': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Silly bug': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-4 mb-2">
        <div className="flex gap-2 items-center">
          <Filter className="w-4 h-4 text-zinc-500" />
          <select 
            className="bg-background border border-surfaceHighlight rounded-lg px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none pr-8 cursor-pointer"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-surface border border-surfaceHighlight rounded-lg overflow-hidden relative min-h-[200px]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/50 backdrop-blur-sm z-10">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="text-xs uppercase bg-surface border-b border-surfaceHighlight whitespace-nowrap text-zinc-500 font-semibold tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-4">Date</th>
                <th scope="col" className="px-6 py-4">Problem</th>
                <th scope="col" className="px-6 py-4">Difficulty</th>
                <th scope="col" className="px-6 py-4">Status</th>
                <th scope="col" className="px-6 py-4">Category</th>
              </tr>
            </thead>
            <tbody>
              {filteredMistakes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle className="w-8 h-8 opacity-20" />
                      <p>No failed attempts found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMistakes.map(m => (
                  <tr key={m.id} className="border-b border-surfaceHighlight hover:bg-surfaceHighlight/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-zinc-400 text-xs">
                        <Calendar className="w-3 h-3" />
                        {new Date(m.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-100 flex items-center gap-2">
                      <span className="text-zinc-500 font-mono text-xs">#{m.leetcode_number}</span>
                      {m.title}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded text-[11px] font-semibold border whitespace-nowrap uppercase tracking-wider ${getDifficultyColor(m.difficulty)}`}>
                        {m.difficulty || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-red-400 font-medium text-xs bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                        {m.status_msg}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] border whitespace-nowrap ${getCategoryColor(m.mistake_category)}`}>
                        {m.mistake_category || 'Skipped'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
