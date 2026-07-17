import { Progress } from '@/components/ui/progress';
import { Link } from '@tanstack/react-router';
import { Target } from 'lucide-react';
import React from 'react';

interface GoalsPlaceholderProps {
  bestWpm?: number;
  avgAccuracy?: number;
  currentStreak?: number;
}

/** Read-only goals snapshot until full goals API is wired (Phase E). */
export const GoalsPlaceholder: React.FC<GoalsPlaceholderProps> = ({
  bestWpm = 0,
  avgAccuracy = 0,
  currentStreak = 0,
}) => {
  const starters = [
    {
      label: 'Hit 60 WPM',
      current: Math.min(bestWpm, 60),
      target: 60,
      unit: 'WPM',
    },
    {
      label: '98% accuracy',
      current: Math.min(avgAccuracy, 98),
      target: 98,
      unit: '%',
    },
    {
      label: '7-day streak',
      current: Math.min(currentStreak, 7),
      target: 7,
      unit: 'days',
    },
  ];

  return (
    <section className="bg-accent/10 rounded-xl p-5 md:p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Target className="size-5 text-accent" />
          Goals
        </h2>
        <span className="text-xs text-text/40">Coming soon</span>
      </div>

      <ul className="space-y-4">
        {starters.map((goal) => {
          const pct = Math.min((goal.current / goal.target) * 100, 100);
          return (
            <li key={goal.label}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-text/80">{goal.label}</span>
                <span className="font-mono text-text/50 text-xs">
                  {Math.round(goal.current)}
                  {goal.unit === '%' ? '%' : ''} / {goal.target}
                  {goal.unit === '%' ? '%' : goal.unit === 'WPM' ? '' : ''}
                </span>
              </div>
              <Progress value={pct} className="h-2" />
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-text/40 mt-5 leading-relaxed">
        Custom goals and progress tracking land in a later update. Keep testing
        — these milestones update from your best stats.{' '}
        <Link to="/test" className="text-accent hover:underline">
          Practice now
        </Link>
      </p>
    </section>
  );
};
