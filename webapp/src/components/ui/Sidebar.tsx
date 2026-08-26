"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Network, LineChart, Settings, ChevronLeft, ChevronRight, Menu, AlertTriangle, Calendar, FolderOpen } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Knowledge Graph', href: '/graph', icon: Network },
  { name: 'Collections', href: '/collections', icon: FolderOpen },
  { name: 'Mistake Log', href: '/mistakes', icon: AlertTriangle },
  { name: 'Review', href: '/review', icon: Calendar },
  { name: 'Analytics', href: '/analytics', icon: LineChart },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const stored = localStorage.getItem('sidebar_collapsed');
    if (stored) {
      setIsCollapsed(stored === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar_collapsed', String(newState));
  };

  return (
    <aside 
      className={`h-full bg-surface border-r border-surfaceHighlight flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="h-14 flex items-center justify-between px-4 border-b border-surfaceHighlight">
        <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
          <div className="w-6 h-6 rounded bg-primary text-zinc-900 flex flex-shrink-0 items-center justify-center font-bold text-xs">
            LC
          </div>
          <span className="font-semibold text-sm whitespace-nowrap text-zinc-100">Companion</span>
        </div>
        <button 
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-surfaceHighlight text-zinc-400 hover:text-zinc-100 transition-colors flex-shrink-0"
        >
          {isCollapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-grow py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center px-2 py-2 rounded-md transition-colors ${
                isActive 
                  ? 'bg-surfaceHighlight text-zinc-100 font-medium' 
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-surfaceHighlight/50'
              }`}
              title={isCollapsed ? item.name : undefined}
            >
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-sm whitespace-nowrap overflow-hidden transition-all duration-300 ${
                isCollapsed ? 'opacity-0 w-0 ml-0' : 'opacity-100 w-auto ml-2'
              }`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
