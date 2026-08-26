"use client";

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, ArrowLeft, X } from 'lucide-react';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import FolderTree from '@/components/graph/FolderTree';
import ProblemDetails from '@/components/ui/ProblemDetails';
import { useRouter } from 'next/navigation';

const ForceGraph = dynamic(() => import('@/components/graph/ForceGraph'), { 
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center h-full bg-[#0a0a0a]"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
});

export default function GraphPage() {
  const router = useRouter();
  const [data, setData] = useState<{patterns: any[], problems: any[], links: any[]}>({ patterns: [], problems: [], links: [] });
  const [loading, setLoading] = useState(true);
  
  const [activePattern, setActivePattern] = useState<any | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [activeProblem, setActiveProblem] = useState<any | null>(null);

  useEffect(() => {
    fetchGraphData();
  }, [router]);

  const fetchGraphData = async () => {
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

  // Top-Level Graph: Nodes = Patterns, Edges = Shared Problems
  const topLevelGraphData = useMemo(() => {
    const nodes = data.patterns;
    const linkMap = new Map<string, number>();

    // For each problem, connect all its patterns
    const problemsToPatterns = new Map<string, string[]>();
    data.links.forEach(l => {
      if (!problemsToPatterns.has(l.target)) problemsToPatterns.set(l.target, []);
      problemsToPatterns.get(l.target)!.push(l.source);
    });

    problemsToPatterns.forEach((pats) => {
      for (let i = 0; i < pats.length; i++) {
        for (let j = i + 1; j < pats.length; j++) {
          const p1 = pats[i];
          const p2 = pats[j];
          const key = p1 < p2 ? `${p1}-${p2}` : `${p2}-${p1}`;
          linkMap.set(key, (linkMap.get(key) || 0) + 1);
        }
      }
    });

    const links = Array.from(linkMap.entries()).map(([key, weight]) => {
      const [source, target] = key.split('-');
      return { source, target, weight };
    });

    return { nodes, links };
  }, [data]);

  // Drill-down Graph: Node = Active Pattern + Child Problems
  const drillDownGraphData = useMemo(() => {
    if (!activePattern) return { nodes: [], links: [] };

    const nodes = [activePattern];
    const links: any[] = [];

    const problemIds = data.links.filter(l => l.source === activePattern.id).map(l => l.target);
    const relatedProblems = data.problems.filter(p => problemIds.includes(p.id));

    relatedProblems.forEach(prob => {
      nodes.push(prob);
      links.push({ source: activePattern.id, target: prob.id });
    });

    return { nodes, links };
  }, [activePattern, data]);

  const handleNodeClick = (node: any) => {
    if (node.type === 'pattern') {
      setActivePattern(node);
      setFocusedNodeId(null);
    } else if (node.type === 'problem') {
      setActiveProblem(node);
      setFocusedNodeId(node.id);
    }
  };

  const handleProblemClick = (problem: any) => {
    // If we're not in the drill-down view of a pattern that contains this problem, go to top-level
    // Or better, just switch the active pattern to one of the problem's patterns so we can zoom to it
    const problemPatternIds = data.links.filter(l => l.target === problem.id).map(l => l.source);
    
    if (activePattern && !problemPatternIds.includes(activePattern.id)) {
      // Find the first pattern this problem belongs to and drill down to it
      const targetPattern = data.patterns.find(p => p.id === problemPatternIds[0]);
      if (targetPattern) setActivePattern(targetPattern);
    } else if (!activePattern && problemPatternIds.length > 0) {
      const targetPattern = data.patterns.find(p => p.id === problemPatternIds[0]);
      if (targetPattern) setActivePattern(targetPattern);
    }

    setFocusedNodeId(problem.id);
    setActiveProblem(problem);
  };

  const handlePatternClick = (pattern: any) => {
    setActivePattern(pattern);
    setFocusedNodeId(null);
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] -m-6 md:-m-8 overflow-hidden rounded-xl border border-surfaceHighlight bg-black">
      
      {/* Left Sidebar: Folder Tree */}
      <div className="w-64 flex-shrink-0 z-10 hidden md:block border-r border-surfaceHighlight">
        <FolderTree 
          patterns={data.patterns} 
          problems={data.problems} 
          links={data.links} 
          onProblemClick={handleProblemClick}
          onPatternClick={handlePatternClick}
        />
      </div>

      {/* Main Graph Area */}
      <div className="flex-1 relative overflow-hidden">
        
        {/* Navigation Overlay */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
          {activePattern && (
            <button 
              onClick={() => {
                setActivePattern(null);
                setFocusedNodeId(null);
              }}
              className="flex items-center gap-2 bg-surface/80 backdrop-blur border border-surfaceHighlight px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:bg-surface transition-colors shadow-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Overview
            </button>
          )}
          <div className="bg-black/60 backdrop-blur-sm border border-zinc-800 px-4 py-2 rounded-lg text-sm text-zinc-400 font-mono shadow-lg pointer-events-none">
            {activePattern ? `Drill-down: ${activePattern.name}` : 'Overview: Pattern Network'}
          </div>
        </div>

        <ForceGraph 
          graphData={activePattern ? drillDownGraphData : topLevelGraphData}
          onNodeClick={handleNodeClick}
          focusedNodeId={focusedNodeId}
        />

        {/* Problem Modal / Details Pane */}
        {activeProblem && (
          <div className="absolute top-4 right-4 bottom-4 w-[600px] xl:w-[800px] z-20">
            <ProblemDetails 
              problemId={activeProblem.db_id} 
              onClose={() => setActiveProblem(null)} 
            />
          </div>
        )}

      </div>
    </div>
  );
}
