import { cn } from '@/lib/utils';
import type { ActivityHeatmap as ActivityHeatmapType } from '@tactile/types';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { useAuth } from '../../contexts';
import { analyticsApi } from '../../services/analyticsApi';
import { Panel } from '../ui/panel';
import { Skeleton } from '../ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface ActivityHeatmapProps {
  heatmapData?: ActivityHeatmapType;
  title?: string;
  year?: number;
}

const getActivityClassName = (count: number, maxCount: number) => {
  if (count === 0) {
    return 'bg-primary';
  }

  // Calculate intensity based on count relative to max
  const intensity = Math.min(count / maxCount, 1);

  if (intensity <= 0.25) {
    return `bg-accent/20`;
  } else if (intensity <= 0.5) {
    return `bg-accent/40`;
  } else if (intensity <= 0.75) {
    return `bg-accent/60`;
  } else {
    return `bg-accent/80`;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getContributionText = (count: number) => {
  if (count === 0) return 'No tests';
  if (count === 1) return '1 test';
  return `${count} tests`;
};

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  heatmapData: propHeatmapData,
  title = 'Activity Heatmap',
  year = new Date().getFullYear(),
}) => {
  const { user } = useAuth();

  // Query for activity heatmap if not provided as prop
  const { data: fetchedHeatmapData, isLoading } = useQuery({
    queryKey: ['userActivity', user?.id, year],
    queryFn: () => analyticsApi.getActivityHeatmap(year),
    enabled: !!user && !propHeatmapData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const heatmapData = propHeatmapData || fetchedHeatmapData;

  // Show loading skeleton if loading and no data
  if (isLoading && !heatmapData) {
    return <Skeleton className="h-[248px] rounded-2xl" />;
  }

  // If no data after loading, return null or error
  if (!heatmapData) {
    return null;
  }

  // Group data by weeks and months for the calendar layout
  const generateCalendarData = () => {
    const dataMap = new Map<string, number>(
      heatmapData.data.map((day: { date: string; count: number }) => [
        day.date,
        day.count,
      ])
    );

    const weeks: Array<Array<{ date: string; count: number }>> = [];

    // Start from the first Sunday of the year
    const firstDayOfYear = new Date(year, 0, 1);
    const startDate = new Date(firstDayOfYear);
    startDate.setDate(firstDayOfYear.getDate() - firstDayOfYear.getDay());

    // Generate 53 weeks to cover the entire year
    for (let weekIndex = 0; weekIndex < 53; weekIndex++) {
      const week: Array<{ date: string; count: number }> = [];

      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + weekIndex * 7 + dayIndex);

        const dateString = currentDate.toISOString().split('T')[0];
        const count = dataMap.get(dateString) || 0;

        week.push({ date: dateString, count });
      }

      weeks.push(week);
    }

    return weeks;
  };

  const calendarWeeks = generateCalendarData();
  const monthLabels = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  return (
    <Panel
      title={`${title} ${year}`}
      description={`${heatmapData.totalTests} tests in ${year}`}
    >
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Month labels */}
          <div className="flex mb-2">
            <div className="w-8"></div> {/* Space for day labels */}
            {calendarWeeks.map((week, weekIndex) => {
              // Check if this week contains the first day of any month
              let monthToShow: number | null = null;

              for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                const date = new Date(week[dayIndex].date);
                if (date.getFullYear() === year && date.getDate() === 1) {
                  monthToShow = date.getMonth();
                  break;
                }
              }

              return (
                <div key={weekIndex} className="flex-1 text-center">
                  {monthToShow !== null && (
                    <span className="text-xs text-text/40">
                      {monthLabels[monthToShow]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex">
            {/* Day labels */}
            <div className="flex flex-col mr-2 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="h-6 text-xs flex items-center text-text/50 leading-3"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="flex gap-1">
              {calendarWeeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day, dayIndex) => (
                    <Tooltip key={`${weekIndex}-${dayIndex}`}>
                      <TooltipTrigger>
                        <div
                          className={cn(
                            'w-6 h-6 rounded-sm cursor-pointer transition-all duration-200',
                            getActivityClassName(
                              day.count,
                              heatmapData.maxCount
                            )
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="bg-accent">
                        <div className="text-xs text-center">
                          <div className="font-semibold">
                            {getContributionText(day.count)}
                          </div>
                          <div className="text-text">
                            {formatDate(day.date)}
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end mt-5 gap-2 text-xs">
        <span className="text-text/40">Less</span>
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className={cn(
              'w-3 h-3 rounded-sm',
              getActivityClassName(
                Math.floor((i * heatmapData.maxCount) / 4),
                heatmapData.maxCount
              )
            )}
          />
        ))}
        <span className="text-text/40">More</span>
      </div>
    </Panel>
  );
};
