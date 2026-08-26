"use client";

import React from 'react';
import { Search, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function TopBar() {
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.postMessage({ type: 'LC_AUTH_LOGOUT' }, '*');
    window.location.href = '/login';
  };
  return (
    <header className="h-14 bg-background border-b border-surfaceHighlight flex items-center justify-between px-6 shrink-0">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search problems, patterns..." 
            className="w-full bg-surface border border-surfaceHighlight rounded-md pl-9 pr-4 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Placeholder for User Profile / Avatar */}
        <div className="w-8 h-8 rounded-full bg-surfaceHighlight flex items-center justify-center text-xs font-medium text-zinc-300">
          U
        </div>
        <button onClick={handleLogout} className="text-zinc-500 hover:text-zinc-300 transition-colors" title="Logout">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
