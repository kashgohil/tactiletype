import { ThemeContext } from '@/contexts/ThemeContext';
import type { DetailedKeystrokeEvent } from '@tactile/types';
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
import React, { useContext, useMemo } from 'react';
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

interface TimelineChartProps {
  keystrokeEvents: DetailedKeystrokeEvent[];
  height?: number;
}

interface TimelineData {
  second: number;
  wpm: number;
  errors: number;
}

export const TimelineChart: React.FC<TimelineChartProps> = ({
  keystrokeEvents,
  height = 300,
}) => {
  const context = useContext(ThemeContext);
  const themeToApply = context?.themeToApply;

  const timelineData = useMemo(() => {
    if (!keystrokeEvents.length) return [];

    const startTime = keystrokeEvents[0].timestamp;
    const data: TimelineData[] = [];
    const maxTime = Math.max(...keystrokeEvents.map((e) => e.timestamp));
    const totalSeconds = Math.ceil((maxTime - startTime) / 1000);

    for (let second = 1; second <= totalSeconds; second++) {
      const secondStart = startTime + (second - 1) * 1000;
      const secondEnd = startTime + second * 1000;

      // Get events in this second
      const eventsInSecond = keystrokeEvents.filter(
        (e) => e.timestamp >= secondStart && e.timestamp < secondEnd
      );

      // Count errors
      const errors = eventsInSecond.filter(
        (e) => !e.correct && !e.isBackspace
      ).length;

      // Calculate WPM up to this second
      const eventsUpToSecond = keystrokeEvents.filter(
        (e) => e.timestamp < secondEnd
      );
      const correctChars = eventsUpToSecond.filter(
        (e) => e.correct && !e.isBackspace
      ).length;
      const timeInMinutes = (secondEnd - startTime) / 60000;
      const wpm =
        timeInMinutes > 0 ? Math.round(correctChars / 5 / timeInMinutes) : 0;

      data.push({ second, wpm, errors });
    }

    return data;
  }, [keystrokeEvents]);

  const data = {
    labels: timelineData.map((d) => d.second.toString()),
    datasets: [
      {
        label: 'WPM',
        data: timelineData.map((d) => d.wpm),
        borderColor: themeToApply?.accentColor || 'rgb(59, 130, 246)',
        backgroundColor:
          themeToApply?.primaryColor || 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: themeToApply?.accentColor || 'rgb(59, 130, 246)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1,
        yAxisID: 'y',
      },
      {
        label: 'Errors',
        data: timelineData.map((d) => d.errors),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: timelineData.map((d) => Math.max(2, d.errors * 2)), // Size based on error count
        pointHoverRadius: timelineData.map((d) =>
          Math.max(4, d.errors * 2 + 2)
        ),
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1,
        yAxisID: 'y1',
        showLine: false, // Scatter plot for errors
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        cornerRadius: 8,
        callbacks: {
          title: (context: TSAny[]) => `Second ${context[0].label}`,
          label: (context: TSAny) => {
            const datasetLabel = context.dataset?.label || '';
            const value = context.parsed?.y || 0;
            if (datasetLabel === 'Errors') {
              return `${value} error${value !== 1 ? 's' : ''}`;
            }
            return `${value} WPM`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time (seconds)',
        },
        grid: {
          display: false,
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 12,
          },
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'WPM',
        },
        beginAtZero: true,
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 12,
          },
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Errors',
        },
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 12,
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  return (
    <div className="bg-accent/10 rounded-lg p-6 w-full">
      <h3 className="text-lg font-semibold mb-4">Typing Progress Timeline</h3>
      <div style={{ height: `${height}px`, width: '100%' }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
};
