import React from 'react';
import { Network } from 'lucide-react';

export default function PatternsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300 h-[80vh] flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 bg-surfaceHighlight/50 rounded-full flex items-center justify-center mb-4">
        <Network className="w-8 h-8 text-zinc-400" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 mb-2 tracking-tight">Patterns Graph View</h1>
        <p className="text-zinc-400 max-w-md mx-auto">
          Visualize connections between LeetCode patterns and understand how concepts interlink. Coming soon.
        </p>
      </div>
    </div>
  );
}
