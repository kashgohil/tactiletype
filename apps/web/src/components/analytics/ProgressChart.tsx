import { ThemeContext } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import type { ProgressChart as ProgressChartType } from '@tactile/types';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { MoveRight, TrendingDown, TrendingUp } from 'lucide-react';
import React, { useContext } from 'react';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/** Canvas can't read CSS vars, so theme hex values get an alpha channel here. */
function withAlpha(color: string, alpha: number): string {
  const hex = color.trim();
  if (!hex.startsWith('#')) return hex;
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const int = parseInt(full.slice(1), 16);
  if (Number.isNaN(int)) return hex;
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function unitFor(type: string): string {
  if (type === 'wpm') return ' WPM';
  if (type === 'accuracy' || type === 'consistency') return '%';
  return '';
}

/**
 * Trend delta as a standalone chip so the surrounding panel can place it in
 * its header — the chart no longer draws a header of its own.
 */
export const ChartTrend: React.FC<{
  trend: ProgressChartType['trend'];
  percentage: number;
  className?: string;
}> = ({ trend, percentage, className }) => {
  const Icon =
    trend === 'improving'
      ? TrendingUp
      : trend === 'declining'
        ? TrendingDown
        : MoveRight;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-mono tabular-nums px-2 py-1 rounded-full',
        trend === 'improving'
          ? 'text-accent bg-accent/12'
          : trend === 'declining'
            ? 'text-destructive bg-destructive/10'
            : 'text-text/45 bg-text/[0.06]',
        className
      )}
      title={`Trend: ${trend}`}
    >
      <Icon className="size-3.5" />
      {trend !== 'stable' && (percentage > 0 ? '+' : '')}
      {trend === 'stable' ? 'steady' : `${(percentage || 0).toFixed(1)}%`}
    </span>
  );
};

interface ProgressChartProps {
  chart: ProgressChartType;
  height?: number;
  className?: string;
}

/**
 * Plot only — no surface, no title, no caption. Whoever renders it owns the
 * framing, which keeps charts from sitting in a box inside a box.
 */
export const ProgressChart: React.FC<ProgressChartProps> = ({
  chart,
  height = 240,
  className,
}) => {
  const context = useContext(ThemeContext);
  const theme = context?.themeToApply;

  const accent = theme?.accentColor || '#ceb11e';
  const text = theme?.textColor || '#333333';
  const primary = theme?.primaryColor || '#fefefe';

  const data = {
    labels: chart.data.map((point) =>
      new Date(point.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    ),
    datasets: [
      {
        label: chart.type.toUpperCase(),
        data: chart.data.map((point) => point.value),
        borderColor: accent,
        backgroundColor: withAlpha(accent, 0.14),
        borderWidth: 2,
        fill: true,
        tension: 0.35,
        pointRadius: chart.data.length > 30 ? 0 : 3,
        pointHoverRadius: 5,
        pointBackgroundColor: accent,
        pointBorderColor: primary,
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        backgroundColor: text,
        titleColor: primary,
        bodyColor: primary,
        borderColor: withAlpha(accent, 0.6),
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
        displayColors: false,
        callbacks: {
          title: (items: { dataIndex: number }[]) => {
            const point = chart.data[items[0].dataIndex];
            return new Date(point.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'long',
              day: 'numeric',
            });
          },
          label: (item: { parsed: { y: number }; dataIndex: number }) => {
            const label = chart.data[item.dataIndex]?.label;
            const value = `${item.parsed.y}${unitFor(chart.type)}`;
            return label ? `${value} · ${label}` : value;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: withAlpha(text, 0.12) },
        ticks: {
          color: withAlpha(text, 0.45),
          font: { size: 11 },
          maxRotation: 0,
          autoSkipPadding: 16,
        },
      },
      y: {
        beginAtZero: chart.type === 'wpm',
        min: chart.type === 'wpm' ? undefined : 0,
        max: chart.type === 'wpm' ? undefined : 100,
        grid: { color: withAlpha(text, 0.08) },
        border: { display: false },
        ticks: {
          color: withAlpha(text, 0.45),
          font: { size: 11 },
          maxTicksLimit: 5,
          callback: (value: string | number) =>
            `${typeof value === 'string' ? parseFloat(value) : value}${unitFor(chart.type)}`,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  return (
    <div className={className} style={{ height: `${height}px` }}>
      <Line data={data} options={options} />
    </div>
  );
};
