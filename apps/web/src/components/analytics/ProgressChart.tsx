import { ThemeContext } from '@/contexts/ThemeContext';
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

interface ProgressChartProps {
  chart: ProgressChartType;
  height?: number;
}

export const ProgressChart: React.FC<ProgressChartProps> = ({
  chart,
  height = 300,
}) => {
  const context = useContext(ThemeContext);
  const themeToApply = context?.themeToApply;

  const getChartColor = (type: string) => {
    switch (type) {
      case 'wpm':
        return {
          border: themeToApply?.accentColor || 'rgb(59, 130, 246)', // blue-500
          background: themeToApply?.primaryColor || 'rgba(59, 130, 246, 0.1)',
        };
      case 'accuracy':
        return {
          border: themeToApply?.accentColor || 'rgb(34, 197, 94)', // green-500
          background: themeToApply?.primaryColor || 'rgba(34, 197, 94, 0.1)',
        };
      case 'consistency':
        return {
          border: themeToApply?.accentColor || 'rgb(168, 85, 247)', // purple-500
          background: themeToApply?.primaryColor || 'rgba(168, 85, 247, 0.1)',
        };
      default:
        return {
          border: themeToApply?.accentColor || 'rgb(107, 114, 128)', // gray-500
          background: themeToApply?.primaryColor || 'rgba(107, 114, 128, 0.1)',
        };
    }
  };

  const colors = getChartColor(chart.type);

  const data = {
    labels: chart.data.map((point) => {
      const date = new Date(point.date);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }),
    datasets: [
      {
        label: chart.type.toUpperCase(),
        data: chart.data.map((point) => point.value),
        borderColor: colors.border,
        backgroundColor: colors.background,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: colors.border,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: colors.border,
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context: TSAny[]) => {
            const date = new Date(chart.data[context[0].dataIndex].date);
            return date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
          },
          label: (context: { parsed: { y: number }; dataIndex: number }) => {
            const value = context.parsed.y;
            const unit =
              chart.type === 'wpm'
                ? ' WPM'
                : chart.type === 'accuracy'
                  ? '%'
                  : chart.type === 'consistency'
                    ? '%'
                    : '';
            return `${chart.type.charAt(0).toUpperCase() + chart.type.slice(1)}: ${value}${unit}`;
          },
        },
      },
    },
    scales: {
      x: {
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
        beginAtZero: chart.type === 'wpm' ? true : false,
        min:
          chart.type === 'accuracy' || chart.type === 'consistency'
            ? 0
            : undefined,
        max:
          chart.type === 'accuracy' || chart.type === 'consistency'
            ? 100
            : undefined,
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 12,
          },
          callback: function (value: string | number) {
            const numValue =
              typeof value === 'string' ? parseFloat(value) : value;
            const unit =
              chart.type === 'wpm'
                ? ' WPM'
                : chart.type === 'accuracy'
                  ? '%'
                  : chart.type === 'consistency'
                    ? '%'
                    : '';
            return numValue + unit;
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  const getTrendIcon = () => {
    switch (chart.trend) {
      case 'improving':
        return <TrendingUp />;
      case 'declining':
        return <TrendingDown />;
      default:
        return <MoveRight />;
    }
  };

  const getTrendColor = () => {
    switch (chart.trend) {
      case 'improving':
        return 'text-green-600';
      case 'declining':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-accent/10 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold capitalize">
          {chart.type} Progress
        </h3>
        <div className={`flex items-center space-x-2 ${getTrendColor()}`}>
          <span className="text-lg">{getTrendIcon()}</span>
          <span className="text-sm font-medium">
            {chart.trendPercentage > 0 ? '+' : ''}
            {(chart.trendPercentage || 0).toFixed(1)}%
          </span>
        </div>
      </div>

      <div style={{ height: `${height}px` }}>
        <Line data={data} options={options} />
      </div>

      <div className="mt-4 text-sm text-center text-gray-600">
        <span className="capitalize">{chart.timeframe}</span> trend over the
        last {chart.data.length} data points
      </div>
    </div>
  );
};
