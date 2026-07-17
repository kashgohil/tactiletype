import type { TypingStats } from '@/utils/typingEngine';
import React from 'react';

interface LiveStatsProps {
  stats: TypingStats;
  hidden?: boolean;
}

export const LiveStats: React.FC<LiveStatsProps> = ({ stats, hidden }) => {
  if (hidden) return null;

  return (
    <div className="flex items-center gap-4 text-sm font-mono text-text/60">
      <span>
        <span className="text-accent font-semibold">{stats.wpm}</span> wpm
      </span>
      <span>
        <span className="text-accent font-semibold">{Math.round(stats.accuracy)}</span>
        %
      </span>
    </div>
  );
};
