"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Loader2, X } from "lucide-react";
import "@excalidraw/excalidraw/index.css";

// Dynamically import Excalidraw to prevent SSR crashes
const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[500px] items-center justify-center bg-[#121212] rounded border border-white/10">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    ),
  }
);

interface ExcalidrawWrapperProps {
  problemId: number;
  onClose: () => void;
}

export default function ExcalidrawWrapper({ problemId, onClose }: ExcalidrawWrapperProps) {
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial canvas data
  useEffect(() => {
    let isMounted = true;
    const fetchDrawing = async () => {
      try {
        const res = await fetch(`/api/problems/${problemId}/drawing`, {
          // Cookies are automatically sent
        });
        if (res.ok) {
          const json = await res.json();
          if (isMounted) {
            setInitialData(json.data || { elements: [], appState: {} });
          }
        }
      } catch (err) {
        console.error("Failed to fetch drawing", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchDrawing();
    return () => { isMounted = false; };
  }, [problemId]);

  // Handle auto-save with debounce
  const handleChange = useCallback((elements: readonly any[], appState: any) => {
    setSaveStatus("saving");
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const payload = {
          canvas_data: {
            elements,
            // Exclude properties that shouldn't be saved or cause cyclical JSON issues
            appState: {
              viewBackgroundColor: appState.viewBackgroundColor,
              currentItemStrokeColor: appState.currentItemStrokeColor,
              currentItemBackgroundColor: appState.currentItemBackgroundColor,
              theme: appState.theme,
            }
          }
        };

        const res = await fetch(`/api/problems/${problemId}/drawing`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } else {
          setSaveStatus("idle");
        }
      } catch (err) {
        console.error("Failed to save drawing", err);
        setSaveStatus("idle");
      }
    }, 2000); // 2 second debounce
  }, [problemId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#121212] rounded-lg border border-white/10">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#121212]">
      <div className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e] border-b border-white/10">
        <h2 className="text-sm font-semibold text-gray-200">Scratchpad</h2>
        <button 
          onClick={onClose}
          className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="relative flex-1 w-full overflow-hidden shadow-inner">
        {/* Save Indicator */}
      <div className="absolute top-4 right-4 z-50">
        {saveStatus === "saving" && (
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur text-gray-300 px-3 py-1.5 rounded-full text-xs font-medium border border-white/10">
            <Loader2 className="w-3 h-3 animate-spin" /> Saving...
          </div>
        )}
        {saveStatus === "saved" && (
          <div className="flex items-center gap-2 bg-green-500/20 backdrop-blur text-green-400 px-3 py-1.5 rounded-full text-xs font-medium border border-green-500/30">
            ✓ Saved
          </div>
        )}
      </div>

      <Excalidraw
        initialData={initialData}
        onChange={handleChange}
        theme="dark"
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: true,
            clearCanvas: true,
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
            saveAsImage: false,
          }
        }}
      />
      </div>
    </div>
  );
}
