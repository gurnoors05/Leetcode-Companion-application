"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, Library } from 'lucide-react';
import FolderTree from '@/components/graph/FolderTree';
import ProblemDetails from '@/components/ui/ProblemDetails';
import { useRouter } from 'next/navigation';

export default function CollectionsPage() {
  const router = useRouter();
  const [data, setData] = useState<{patterns: any[], problems: any[], links: any[]}>({ patterns: [], problems: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [activeProblemId, setActiveProblemId] = useState<number | null>(null);

  useEffect(() => {
    fetchCollectionsData();
  }, [router]);

  const fetchCollectionsData = async () => {
    try {
      const res = await fetch('/api/graph');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleProblemClick = (problem: any) => {
    // Note: the problem object here comes from FolderTree which uses the graph API data.
    // The graph API returns `db_id` for the actual problem ID.
    setActiveProblemId(problem.db_id);
  };

  const handlePatternClick = (pattern: any) => {
    // Could show a pattern overview, but for now we do nothing when clicking a pattern folder,
    // as it just toggles the folder open/closed in the FolderTree itself.
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] -m-6 md:-m-8 overflow-hidden rounded-xl border border-surfaceHighlight bg-background shadow-lg">
      
      {/* Left Sidebar: Folder Tree */}
      <div className="w-72 flex-shrink-0 z-10 border-r border-surfaceHighlight bg-surface">
        <FolderTree 
          patterns={data.patterns} 
          problems={data.problems} 
          links={data.links} 
          onProblemClick={handleProblemClick}
          onPatternClick={handlePatternClick}
        />
      </div>

      {/* Main Area: Problem Details */}
      <div className="flex-1 overflow-hidden bg-black/20">
        {activeProblemId ? (
          <ProblemDetails 
            problemId={activeProblemId} 
            className="border-none rounded-none" // Remove borders to blend with layout
          />
        ) : (
          <div className="flex flex-col h-full items-center justify-center text-zinc-500 space-y-4">
            <div className="w-16 h-16 rounded-full bg-surfaceHighlight/50 flex items-center justify-center">
              <Library className="w-8 h-8 text-zinc-400" />
            </div>
            <p className="text-sm font-medium">Select a problem from the collections to view its details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
