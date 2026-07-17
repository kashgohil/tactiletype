import { ProgressChart } from '@/components/analytics/ProgressChart';
import type { ProgressPoint } from '@/services/api';
import type { ProgressChart as ProgressChartType } from '@tactile/types';
import React, { useMemo, useState } from 'react';
import { Skeleton } from '../ui/skeleton';

interface ProfileProgressChartProps {
  series: ProgressPoint[];
  isLoading?: boolean;
  days?: number;
}

export const ProfileProgressChart: React.FC<ProfileProgressChartProps> = ({
  series,
  isLoading,
  days = 30,
}) => {
  const [metric, setMetric] = useState<'wpm' | 'accuracy'>('wpm');

  const chart: ProgressChartType | null = useMemo(() => {
    if (!series.length) return null;
    const values = series.map((p) =>
      metric === 'wpm' ? p.avgWpm : p.avgAccuracy
    );
    const first = values[0] ?? 0;
    const last = values[values.length - 1] ?? 0;
    const delta = first === 0 ? 0 : ((last - first) / first) * 100;
    const trend: ProgressChartType['trend'] =
      Math.abs(delta) < 2 ? 'stable' : delta > 0 ? 'improving' : 'declining';

    return {
      type: metric,
      timeframe: 'daily',
      data: series.map((p) => ({
        date: p.date,
        value: metric === 'wpm' ? p.avgWpm : p.avgAccuracy,
        label: `${p.testCount} test${p.testCount === 1 ? '' : 's'}`,
      })),
      trend,
      trendPercentage: Math.round(Math.abs(delta) * 10) / 10,
    };
  }, [series, metric]);

  if (isLoading) {
    return <Skeleton className="h-[280px] w-full rounded-xl" />;
  }

  if (!chart) {
    return (
      <div className="bg-accent/10 rounded-xl p-6 min-h-[200px] flex items-center justify-center">
        <p className="text-sm text-text/40 text-center max-w-sm">
          Complete tests over a few days to see your {days}-day trend here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-accent/10 rounded-xl p-4 md:p-5 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-text/50">Last {days} days</p>
        <div className="flex gap-1 bg-accent/15 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setMetric('wpm')}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              metric === 'wpm'
                ? 'bg-accent text-text'
                : 'text-text/60 hover:text-text'
            }`}
          >
            WPM
          </button>
          <button
            type="button"
            onClick={() => setMetric('accuracy')}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              metric === 'accuracy'
                ? 'bg-accent text-text'
                : 'text-text/60 hover:text-text'
            }`}
          >
            Accuracy
          </button>
        </div>
      </div>
      <ProgressChart chart={chart} height={220} />
    </div>
  );
};
