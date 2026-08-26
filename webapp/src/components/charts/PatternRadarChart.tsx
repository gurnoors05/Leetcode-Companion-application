"use client";

import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';

export interface PatternData {
  pattern: string;
  count: number;
}

export default function PatternRadarChart({ data }: { data: PatternData[] }) {
  // If no data, show empty state
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <p>No pattern data available yet.</p>
        <p className="text-sm">Start solving problems to see your strengths!</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#333344" />
          <PolarAngleAxis 
            dataKey="pattern" 
            tick={{ fill: '#9ca3af', fontSize: 12 }}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 'dataMax']} 
            tick={{ fill: '#6b7280' }} 
            tickCount={4} 
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(15, 15, 20, 0.9)', 
              borderColor: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff'
            }}
            itemStyle={{ color: '#8b5cf6' }}
          />
          <Radar 
            name="Problems Solved" 
            dataKey="count" 
            stroke="#8b5cf6" 
            fill="#8b5cf6" 
            fillOpacity={0.4} 
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
