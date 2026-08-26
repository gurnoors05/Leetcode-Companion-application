import React, { useRef, useEffect, useState, useMemo } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';

interface ForceGraphProps {
  graphData: {
    nodes: any[];
    links: any[];
  };
  onNodeClick: (node: any) => void;
  focusedNodeId?: string | null;
}

export default function ForceGraph({ graphData, onNodeClick, focusedNodeId }: ForceGraphProps) {
  const fgRef = useRef<ForceGraphMethods>();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverNode, setHoverNode] = useState<any | null>(null);

  const neighborMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    graphData.links.forEach(l => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;
      if (!map.has(sId)) map.set(sId, new Set());
      if (!map.has(tId)) map.set(tId, new Set());
      map.get(sId)!.add(tId);
      map.get(tId)!.add(sId);
    });
    return map;
  }, [graphData.links]);

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
    
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (focusedNodeId && fgRef.current && graphData.nodes.length > 0) {
      const node = graphData.nodes.find(n => n.id === focusedNodeId);
      if (node && node.x !== undefined && node.y !== undefined) {
        fgRef.current.centerAt(node.x, node.y, 1000);
        fgRef.current.zoom(3, 1000);
      }
    }
  }, [focusedNodeId, graphData]);

  const renderNode = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.type === 'pattern' ? node.name : node.title;
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;

    // Node sizing
    const radius = node.type === 'pattern' ? 2 : 1.2;

    const isHovered = hoverNode && node.id === hoverNode.id;
    const isNeighbor = hoverNode && neighborMap.get(hoverNode.id)?.has(node.id);
    const isDimmed = hoverNode && !isHovered && !isNeighbor;

    // Draw Circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    
    if (isHovered) {
      ctx.fillStyle = '#ef4444'; // Red for hovered node
    } else if (isNeighbor) {
      ctx.fillStyle = '#ffffff'; // White for neighbors
    } else if (isDimmed) {
      ctx.fillStyle = '#27272a'; // Dimmed zinc-800
    } else {
      ctx.fillStyle = node.type === 'pattern' ? '#e4e4e7' : '#a1a1aa';
    }
    
    ctx.fill();

    // Draw Label
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    if (isHovered || isNeighbor) {
      ctx.fillStyle = '#ffffff';
    } else if (isDimmed) {
      ctx.fillStyle = '#27272a';
    } else {
      ctx.fillStyle = '#71717a';
    }

    if (globalScale > 0.8 || node.type === 'pattern') {
      ctx.fillText(label, node.x, node.y + radius + (2 / globalScale));
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-[#0a0a0a] relative">
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeCanvasObject={renderNode}
        linkColor={(link: any) => {
          if (!hoverNode) return 'rgba(113, 113, 122, 0.6)'; // Default zinc-500 @ 60%
          const sId = typeof link.source === 'object' ? link.source.id : link.source;
          const tId = typeof link.target === 'object' ? link.target.id : link.target;
          if (sId === hoverNode.id || tId === hoverNode.id) {
            return 'rgba(239, 68, 68, 1)'; // Active red @ 100%
          }
          return 'rgba(39, 39, 42, 0.2)'; // Dimmed zinc-800 @ 20%
        }}
        linkWidth={(link: any) => {
          if (!hoverNode) return 1;
          const sId = typeof link.source === 'object' ? link.source.id : link.source;
          const tId = typeof link.target === 'object' ? link.target.id : link.target;
          return (sId === hoverNode.id || tId === hoverNode.id) ? 2 : 0.5;
        }}
        onNodeClick={onNodeClick}
        onNodeHover={(node) => setHoverNode(node || null)}
        d3VelocityDecay={0.1}
        cooldownTicks={100}
        onEngineStop={() => {
          if (fgRef.current && !focusedNodeId) {
            fgRef.current.zoomToFit(400, 50);
          }
        }}
      />
    </div>
  );
}
