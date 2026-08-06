import { panelSurface } from '@/components/ui/panel';
import { cn } from '@/lib/utils';
import type { UserStats } from '@/services/api';
import { formatTime } from '@/utils/typingEngine';
import { Flame, Target, Trophy, Zap } from 'lucide-react';
import React from 'react';
import { Skeleton } from '../ui/skeleton';

interface MetricHierarchyProps {
  stats: UserStats | null;
  isLoading?: boolean;
}

function PrimaryMetric({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <div
      className={cn(
        panelSurface,
        'p-5 md:p-6 flex flex-col gap-2 min-h-[120px]'
      )}
    >
      <div className="flex items-center gap-2 text-text/50 text-sm font-medium">
        {icon}
        {label}
      </div>
      <div className="text-3xl md:text-4xl font-bold text-accent tracking-tight font-mono tabular-nums">
        {value}
      </div>
      {hint && <p className="text-xs text-text/40 mt-auto">{hint}</p>}
    </div>
  );
}

function SecondaryMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="px-4 py-3 text-center">
      <div className="text-lg font-semibold text-text font-mono tabular-nums">
        {value}
      </div>
      <div className="text-xs text-text/50 mt-0.5">{label}</div>
    </div>
  );
}

export const MetricHierarchy: React.FC<MetricHierarchyProps> = ({
  stats,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[74px] rounded-2xl" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <PrimaryMetric
          label="Best WPM"
          value={Math.round(Number(stats.bestWpm))}
          icon={<Zap className="size-4 text-accent" />}
          hint="Personal best"
        />
        <PrimaryMetric
          label="Avg accuracy"
          value={`${Number(stats.avgAccuracy).toFixed(1)}%`}
          icon={<Target className="size-4 text-accent" />}
          hint="Across all tests"
        />
        <PrimaryMetric
          label="Current streak"
          value={stats.currentStreak}
          icon={<Flame className="size-4 text-accent" />}
          hint={
            stats.currentStreak > 0
              ? `${stats.currentStreak} day${stats.currentStreak === 1 ? '' : 's'} in a row`
              : 'Take a test today'
          }
        />
        <PrimaryMetric
          label="Tests taken"
          value={stats.totalTests}
          icon={<Trophy className="size-4 text-accent" />}
          hint="All time"
        />
      </div>

      {/* Secondary numbers share one surface, split by rules instead of gaps. */}
      <div
        className={cn(
          panelSurface,
          'grid grid-cols-2 sm:grid-cols-3 divide-x divide-y sm:divide-y-0 divide-accent/10 overflow-hidden'
        )}
      >
        <SecondaryMetric
          label="Avg WPM"
          value={Math.round(Number(stats.avgWpm))}
        />
        <SecondaryMetric
          label="Longest streak"
          value={stats.longestStreak}
        />
        <SecondaryMetric
          label="Time practiced"
          value={formatTime(stats.totalTime)}
        />
      </div>
    </div>
  );
};
