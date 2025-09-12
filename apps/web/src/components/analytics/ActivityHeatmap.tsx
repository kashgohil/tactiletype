import { cn } from '@/lib/utils';
import type { ActivityHeatmap as ActivityHeatmapType } from '@tactile/types';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { useAuth } from '../../contexts';
import { analyticsApi } from '../../services/analyticsApi';
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
    return (
      <div className="bg-accent/10 rounded-lg p-6">
        <div className="mb-6">
          <div className="h-6 bg-accent/20 rounded w-48 mb-2 animate-pulse"></div>
          <div className="flex items-center justify-between">
            <div className="h-6 bg-accent/20 rounded w-32 animate-pulse"></div>
            <div className="h-6 bg-accent/20 rounded w-24 animate-pulse"></div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Month labels skeleton */}
            <div className="flex mb-2">
              <div className="w-8"></div>
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="flex-1 text-center">
                  <div className="h-3 bg-accent/20 rounded w-8 mx-auto animate-pulse"></div>
                </div>
              ))}
            </div>

            <div className="flex">
              {/* Day labels skeleton */}
              <div className="flex flex-col mr-2 gap-1">
                {Array.from({ length: 7 }, (_, i) => (
                  <div
                    key={i}
                    className="h-6 text-xs text-text/50 flex items-center leading-3"
                  >
                    <div className="h-3 bg-accent/20 rounded w-6 animate-pulse"></div>
                  </div>
                ))}
              </div>

              {/* Calendar grid skeleton */}
              <div className="flex gap-1">
                {Array.from({ length: 53 }, (_, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {Array.from({ length: 7 }, (_, dayIndex) => (
                      <div
                        key={dayIndex}
                        className="w-6 h-6 rounded-sm bg-accent/20 animate-pulse"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend skeleton */}
        <div className="flex items-center justify-center mt-6 space-x-2">
          <div className="h-4 bg-accent/20 rounded w-16 animate-pulse"></div>
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-sm bg-accent/20 animate-pulse"
            ></div>
          ))}
          <div className="h-4 bg-accent/20 rounded w-12 animate-pulse"></div>
        </div>
      </div>
    );
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
    <div className="bg-accent/10 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">
          {title} {year}
        </h3>
        <div className="flex items-center justify-between text-sm text-text/40">
          <span>
            {heatmapData.totalTests} tests in {year}
          </span>
        </div>
      </div>

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
                    <span className="text-xs text-gray-500">
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
      <div className="flex items-center justify-center mt-6 space-x-2 text-sm">
        <span className="text-gray-600">Less</span>
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
        <span className="text-gray-600">More</span>
      </div>
    </div>
  );
};
