import { Flame } from 'lucide-react';
import type React from 'react';
import { ActivityHeatmap } from '@/components/analytics/ActivityHeatmap';

interface ActivitySectionProps {
  year?: number;
  currentStreak?: number;
  longestStreak?: number;
  totalTests?: number;
}

export const ActivitySection: React.FC<ActivitySectionProps> = ({
  year = new Date().getFullYear(),
  currentStreak = 0,
  longestStreak = 0,
  totalTests = 0,
}) => {
  let narrative: string;
  if (totalTests === 0) {
    narrative = 'No activity yet this year. One short session starts your map.';
  } else if (currentStreak === 0) {
    narrative = `You've completed ${totalTests} test${totalTests === 1 ? '' : 's'} this year. Jump back in to restart your streak.`;
  } else if (currentStreak >= longestStreak && currentStreak >= 3) {
    narrative = `🔥 ${currentStreak}-day streak — matching your best. Keep the fire going.`;
  } else if (currentStreak === 1) {
    narrative = 'Day 1 of a new streak. Come back tomorrow to build momentum.';
  } else {
    narrative = `${currentStreak}-day streak going (best: ${longestStreak}). Consistency compounds.`;
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3 px-1">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Flame className="size-5 text-accent" />
            Activity
          </h2>
          <p className="text-sm text-text/50 mt-1 max-w-xl leading-relaxed">{narrative}</p>
        </div>
      </div>
      <ActivityHeatmap year={year} title="Year in tests" />
    </section>
  );
};
