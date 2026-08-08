import type { ProgressChart as ProgressChartType } from '@tactile/types';
import type React from 'react';
import { useMemo, useState } from 'react';
import { ChartTrend, ProgressChart } from '@/components/analytics/ProgressChart';
import { Panel } from '@/components/ui/panel';
import { cn } from '@/lib/utils';
import type { ProgressPoint } from '@/services/api';
import { Skeleton } from '../ui/skeleton';

interface ProfileProgressChartProps {
  series: ProgressPoint[];
  isLoading?: boolean;
  days?: number;
  className?: string;
}

const METRICS = [
  { id: 'wpm' as const, label: 'WPM' },
  { id: 'accuracy' as const, label: 'Accuracy' },
];

export const ProfileProgressChart: React.FC<ProfileProgressChartProps> = ({
  series,
  isLoading,
  days = 30,
  className,
}) => {
  const [metric, setMetric] = useState<'wpm' | 'accuracy'>('wpm');

  const chart: ProgressChartType | null = useMemo(() => {
    if (!series.length) return null;
    const values = series.map((p) => (metric === 'wpm' ? p.avgWpm : p.avgAccuracy));
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

  const latest = chart?.data[chart.data.length - 1]?.value ?? null;
  const unit = metric === 'wpm' ? 'WPM' : '%';

  const toggle = (
    <div className="flex gap-0.5 rounded-lg border border-accent/15 p-0.5">
      {METRICS.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setMetric(m.id)}
          aria-pressed={metric === m.id}
          className={cn(
            'text-xs px-2.5 py-1 rounded-md cursor-pointer',
            'transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
            metric === m.id
              ? 'bg-accent text-on-accent font-medium'
              : 'text-text/55 hover:text-text'
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );

  return (
    <Panel
      title="Progress"
      description={`Daily average over the last ${days} days`}
      action={toggle}
      className={className}
      bodyClassName="flex flex-col"
    >
      {isLoading ? (
        <Skeleton className="h-[240px] w-full rounded-2xl" />
      ) : !chart ? (
        <div className="min-h-[240px] flex items-center justify-center">
          <p className="text-sm text-text/40 text-center max-w-xs leading-relaxed">
            Complete tests over a few days and your {days}-day trend shows up here.
          </p>
        </div>
      ) : (
        <>
          {/* Reading of the line, stated before the line itself. */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-bold font-mono tabular-nums tracking-tight">
              {latest != null ? Math.round(latest) : '-'}
              <span className="text-base text-text/40 ml-1 font-sans font-normal">{unit}</span>
            </span>
            <ChartTrend trend={chart.trend} percentage={chart.trendPercentage} />
          </div>
          <ProgressChart chart={chart} height={220} />
        </>
      )}
    </Panel>
  );
};
