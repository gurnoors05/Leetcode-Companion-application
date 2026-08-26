"use client";

import React, { useState, useEffect } from 'react';
import { LineChart, Loader2, Settings, Flame, Calendar as CalendarIcon, ArrowRight, Award, Clock, Target, History } from 'lucide-react';
import { ActivityCalendar, ThemeInput } from 'react-activity-calendar';
import 'react-activity-calendar/tooltips.css';
import Link from 'next/link';

function timeAgo(timestamp: string) {
  const seconds = Math.floor(Date.now() / 1000 - parseInt(timestamp));
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
}

interface AnalyticsData {
  heatmap: {
    dailyCounts: { date: string, count: number, level: number }[];
    currentStreak: number;
    totalActiveDays: number;
  };
  recentSubmissions: {
    id: string;
    title: string;
    titleSlug: string;
    timestamp: string;
  }[];
  badges: {
    earned: {
      id: string;
      name: string;
      icon: string;
      hoverText: string;
    }[];
    upcoming: {
      name: string;
      icon: string;
      progress: number;
    }[];
  };
  difficultyProgress: {
    easy: { total: number; solved: number };
    medium: { total: number; solved: number };
    hard: { total: number; solved: number };
  };
}

const leetcodeTheme: ThemeInput = {
  light: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
  dark: ['#282828', '#0e4429', '#006d32', '#26a641', '#39d353'],
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      const res = await fetch('/api/analytics/leetcode-activity');
      if (res.status === 400) {
        const json = await res.json();
        if (json.error === 'USERNAME_NOT_SET') {
          setError('USERNAME_NOT_SET');
          setLoading(false);
          return;
        }
      }
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError('Failed to fetch activity');
      }
    } catch (e) {
      console.error(e);
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error === 'USERNAME_NOT_SET') {
    return (
      <div className="flex flex-col h-full items-center justify-center space-y-6 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-surfaceHighlight/50 rounded-full flex items-center justify-center">
          <Settings className="w-8 h-8 text-zinc-400" />
        </div>
        <div className="max-w-sm">
          <h2 className="text-xl font-bold text-zinc-100 mb-2">Connect LeetCode</h2>
          <p className="text-sm text-zinc-400 mb-6">
            Please provide your LeetCode username in Settings to view your activity heatmap and analytics.
          </p>
          <a
            href="/settings"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-sm font-medium transition-colors"
          >
            <Settings className="w-4 h-4" />
            Go to Settings
          </a>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col h-full items-center justify-center space-y-6 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center">
          <Settings className="w-8 h-8 text-error" />
        </div>
        <div className="max-w-sm">
          <h2 className="text-xl font-bold text-zinc-100 mb-2">Failed to Fetch Activity</h2>
          <p className="text-sm text-zinc-400 mb-6">
            We couldn't load your LeetCode data. Please make sure you have provided a valid LeetCode username in the Settings page.
          </p>
          <a
            href="/settings"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-surfaceHighlight hover:bg-zinc-800 text-zinc-300 rounded-xl text-sm font-medium transition-colors border border-zinc-700/50"
          >
            <Settings className="w-4 h-4" />
            Check Settings
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 pt-8 pb-12">
      <div className="flex items-center gap-4 border-b border-surfaceHighlight pb-6">
        <div className="w-12 h-12 bg-surfaceHighlight/50 rounded-xl flex items-center justify-center">
          <LineChart className="w-6 h-6 text-zinc-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Analytics</h1>
          <p className="text-sm text-zinc-400">Your complete LeetCode activity history.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Streak Card */}
        <div className="bg-surface border border-surfaceHighlight rounded-xl p-6 flex items-center gap-6">
          <div className="w-14 h-14 bg-orange-500/10 rounded-full flex items-center justify-center shrink-0">
            <Flame className="w-7 h-7 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-1">Current Streak</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-zinc-100">{data.heatmap.currentStreak}</span>
              <span className="text-zinc-400 font-medium pb-1">days</span>
            </div>
          </div>
        </div>

        {/* Active Days Card */}
        <div className="bg-surface border border-surfaceHighlight rounded-xl p-6 flex items-center gap-6">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
            <CalendarIcon className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Active Days</p>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-zinc-100">{data.heatmap.totalActiveDays}</span>
              <span className="text-zinc-400 font-medium pb-1">days this year</span>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Card */}
      <div className="bg-surface border border-surfaceHighlight rounded-xl p-6 overflow-x-auto custom-scrollbar">
        <h2 className="text-sm font-bold text-zinc-100 mb-6 flex items-center gap-2">
          <LineChart className="w-4 h-4 text-primary" />
          Activity Heatmap
        </h2>
        
        <div className="min-w-[800px]">
          <ActivityCalendar 
            data={data.heatmap.dailyCounts}
            theme={leetcodeTheme}
            colorScheme="dark"
            blockSize={13}
            blockMargin={4}
            fontSize={12}
            labels={{
              totalCount: '{{count}} submissions in the last year',
            }}
            showWeekdayLabels={true}
            tooltips={{
              activity: {
                text: (activity) => `${activity.count} submissions on ${activity.date}`
              }
            }}
          />
        </div>
      </div>

      {/* Difficulty Breakdown */}
      <div>
        <h2 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-zinc-400" />
          Difficulty Breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Easy', color: 'text-success', bg: 'bg-success', data: data.difficultyProgress.easy },
            { label: 'Medium', color: 'text-warning', bg: 'bg-warning', data: data.difficultyProgress.medium },
            { label: 'Hard', color: 'text-error', bg: 'bg-error', data: data.difficultyProgress.hard }
          ].map(diff => (
            <div key={diff.label} className="bg-surface border border-surfaceHighlight rounded-xl p-5">
              <div className="flex justify-between items-end mb-3">
                <span className={`text-sm font-bold uppercase tracking-wider ${diff.color}`}>{diff.label}</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-zinc-100">{diff.data.solved}</span>
                  <span className="text-xs text-zinc-500 ml-1">/ {diff.data.total}</span>
                </div>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${diff.bg}`} 
                  style={{ width: `${diff.data.total > 0 ? (diff.data.solved / diff.data.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Badges Section */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Award className="w-5 h-5 text-zinc-400" />
            Badges
          </h2>
          <div className="bg-surface border border-surfaceHighlight rounded-xl p-5">
            <div className="flex flex-wrap gap-4">
              {data.badges.earned.map(badge => (
                <div key={badge.id} className="relative group cursor-default">
                  <img 
                    src={badge.icon.startsWith('/') ? `https://leetcode.com${badge.icon}` : badge.icon} 
                    alt={badge.name}
                    className="w-14 h-14 object-contain drop-shadow-md hover:scale-110 transition-transform"
                    title={badge.hoverText}
                  />
                </div>
              ))}
              {data.badges.upcoming.map((badge, idx) => (
                <div key={idx} className="relative group opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
                  <img 
                    src={badge.icon.startsWith('/') ? `https://leetcode.com${badge.icon}` : badge.icon} 
                    alt={badge.name}
                    className="w-14 h-14 object-contain drop-shadow-md"
                    title={`${badge.name} (Upcoming)`}
                  />
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-zinc-800 rounded-full overflow-hidden">
                     <div className="h-full bg-primary" style={{ width: '10%' }} />
                  </div>
                </div>
              ))}
              {data.badges.earned.length === 0 && data.badges.upcoming.length === 0 && (
                <p className="text-sm text-zinc-500 italic">No badges earned yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Submissions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <History className="w-5 h-5 text-zinc-400" />
            Recent Submissions
          </h2>
          <div className="bg-surface border border-surfaceHighlight rounded-xl overflow-hidden">
            <ul className="divide-y divide-surfaceHighlight">
              {data.recentSubmissions.map(sub => (
                <li key={sub.id}>
                  <a 
                    href={`https://leetcode.com/problems/${sub.titleSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-4 hover:bg-surfaceHighlight/50 transition-colors group"
                  >
                    <span className="text-sm font-semibold text-zinc-300 group-hover:text-primary transition-colors">
                      {sub.title}
                    </span>
                    <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {timeAgo(sub.timestamp)}
                    </span>
                  </a>
                </li>
              ))}
              {data.recentSubmissions.length === 0 && (
                <li className="p-8 text-center text-zinc-500 text-sm">No recent submissions found.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
