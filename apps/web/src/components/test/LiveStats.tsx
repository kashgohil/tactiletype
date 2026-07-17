import type { ComboState } from '@/utils/combo';
import type { TypingStats } from '@/utils/typingEngine';
import { cn } from '@/lib/utils';
import React, { useEffect, useRef, useState } from 'react';

interface LiveStatsProps {
  stats: TypingStats;
  hidden?: boolean;
  combo?: ComboState | null;
}

export const LiveStats: React.FC<LiveStatsProps> = ({ stats, hidden, combo }) => {
  const [pulse, setPulse] = useState(false);
  const prevCombo = useRef(0);

  useEffect(() => {
    const cur = combo?.current ?? 0;
    if (cur > prevCombo.current && cur >= 2) {
      setPulse(true);
      const t = window.setTimeout(() => setPulse(false), 180);
      prevCombo.current = cur;
      return () => clearTimeout(t);
    }
    prevCombo.current = cur;
  }, [combo?.current]);

  if (hidden) return null;

  const showCombo = combo && combo.current >= 2;

  return (
    <div className="flex items-center gap-4 text-sm font-mono text-text/55">
      <span className="tabular-nums">
        <span className="text-accent font-semibold">{stats.wpm}</span>
        <span className="text-text/35 ml-1">wpm</span>
      </span>
      <span className="tabular-nums">
        <span className="text-accent font-semibold">{Math.round(stats.accuracy)}</span>
        <span className="text-text/35">%</span>
      </span>
      {showCombo && (
        <span
          className={cn(
            'tabular-nums inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5',
            'transition-[transform,color,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
            combo.multiplier >= 3
              ? 'text-amber-400 bg-amber-400/10'
              : 'text-text/70 bg-accent/10',
            pulse && 'scale-110'
          )}
          title={`Best combo this run: ${combo.best}`}
          data-allow-transform-motion=""
        >
          <span className="font-semibold">{combo.current}</span>
          <span className="text-text/35 text-xs">combo</span>
          {combo.multiplier > 1 && (
            <span className="ml-0.5 text-accent text-xs font-semibold">
              ×{combo.multiplier}
            </span>
          )}
        </span>
      )}
    </div>
  );
};
