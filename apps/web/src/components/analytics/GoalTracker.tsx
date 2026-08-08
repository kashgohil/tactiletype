import type { UserGoal } from '@tactile/types';
import {
  BarChart,
  Calendar,
  PartyPopper,
  Sparkle,
  Target,
  Timer,
  Trash,
  Trophy,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { Button } from '../ui/button';
import { DatePicker } from '../ui/date-picker';
import { Input } from '../ui/input';
import { Panel } from '../ui/panel';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface GoalTrackerProps {
  goals: UserGoal[];
  onCreateGoal: (goalData: {
    goalType: 'wpm' | 'accuracy' | 'consistency' | 'daily_tests';
    targetValue: number;
    targetDate?: string;
  }) => void;
  onDeleteGoal: (goalId: string) => void;
}

export const GoalTracker: React.FC<GoalTrackerProps> = ({ goals, onCreateGoal, onDeleteGoal }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    goalType: 'wpm' as 'wpm' | 'accuracy' | 'consistency' | 'daily_tests',
    targetValue: 0,
    targetDate: undefined as Date | undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGoal.targetValue > 0) {
      onCreateGoal({
        ...newGoal,
        targetDate: newGoal.targetDate ? newGoal.targetDate.toISOString().split('T')[0] : undefined,
      });
      setNewGoal({
        goalType: 'wpm',
        targetValue: 0,
        targetDate: undefined,
      });
      setShowCreateForm(false);
    }
  };

  const getGoalIcon = (goalType: string) => {
    switch (goalType) {
      case 'wpm':
        return <Sparkle className="text-accent" />;
      case 'accuracy':
        return <Target className="text-accent" />;
      case 'consistency':
        return <BarChart className="text-accent" />;
      case 'daily_tests':
        return <Calendar className="text-accent" />;
      default:
        return <Target className="text-accent" />;
    }
  };

  const getGoalUnit = (goalType: string) => {
    switch (goalType) {
      case 'wpm':
        return ' WPM';
      case 'accuracy':
      case 'consistency':
        return '%';
      case 'daily_tests':
        return ' tests/day';
      default:
        return '';
    }
  };

  const calculateProgress = (goal: UserGoal) => {
    const current = Number(goal.currentValue);
    const target = Number(goal.targetValue);
    return Math.min((current / target) * 100, 100);
  };

  const isGoalExpired = (goal: UserGoal) => {
    if (!goal.targetDate) return false;
    return new Date(goal.targetDate) < new Date();
  };

  const getDaysRemaining = (goal: UserGoal) => {
    if (!goal.targetDate) return null;
    const today = new Date();
    const target = new Date(goal.targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Panel
      title="Your goals"
      icon={<Target className="size-4 text-accent" />}
      action={
        <Button size="sm" variant="ghost" onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : 'Add goal'}
        </Button>
      }
    >
      {/* Create Goal Form — separated by a rule, not by a second fill. */}
      {showCreateForm && (
        <form onSubmit={handleSubmit} className="mb-5 pb-5 border-b border-accent/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="goal-type" className="block text-sm font-medium text-text/55 mb-1">
                Goal Type
              </label>
              <Select
                value={newGoal.goalType}
                onValueChange={(value) =>
                  setNewGoal({
                    ...newGoal,
                    goalType: value as 'wpm' | 'accuracy' | 'consistency' | 'daily_tests',
                  })
                }
              >
                <SelectTrigger id="goal-type" className="w-full">
                  <SelectValue className="capitalize" placeholder="Select a goal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wpm">Words Per Minute</SelectItem>
                  <SelectItem value="accuracy">Accuracy</SelectItem>
                  <SelectItem value="consistency">Consistency</SelectItem>
                  <SelectItem value="daily_tests">Daily Tests</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="goal-target" className="block text-sm font-medium text-text/55 mb-1">
                Target Value
              </label>
              <Input
                id="goal-target"
                type="number"
                value={newGoal.targetValue || ''}
                onChange={(e) =>
                  setNewGoal({
                    ...newGoal,
                    targetValue: Number(e.target.value),
                  })
                }
                placeholder={`Enter target ${getGoalUnit(newGoal.goalType).trim()}`}
                required
              />
            </div>

            <div>
              <label htmlFor="goal-date" className="block text-sm font-medium text-text/55 mb-1">
                Target Date (Optional)
              </label>
              <DatePicker
                id="goal-date"
                date={newGoal.targetDate}
                onDateChange={(date: Date | undefined) =>
                  setNewGoal({ ...newGoal, targetDate: date })
                }
                placeholder="Select target date"
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button type="submit">Create Goal</Button>
          </div>
        </form>
      )}

      {/* Goals list — rows on the panel, split by rules. */}
      {goals.length === 0 ? (
        <div className="text-center py-8">
          <Target className="text-accent/60 mx-auto mb-3 size-8" />
          <p className="text-sm text-text/50 max-w-[15rem] mx-auto leading-relaxed">
            No goals yet. Set one and progress tracks itself as you type.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-accent/10 -my-4">
          {goals.map((goal) => {
            const progress = calculateProgress(goal);
            const daysRemaining = getDaysRemaining(goal);
            const isExpired = isGoalExpired(goal);
            const isAchieved = goal.isAchieved || progress >= 100;

            return (
              <li key={goal.id} className="py-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="[&>svg]:size-4 shrink-0">{getGoalIcon(goal.goalType)}</span>
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm capitalize truncate">
                        {goal.goalType.replace('_', ' ')}
                      </h4>
                      <p className="text-xs text-text/45 font-mono tabular-nums">
                        {Number(goal.currentValue)} / {Number(goal.targetValue)}
                        {getGoalUnit(goal.goalType)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isAchieved && <Trophy className="size-4 text-accent" />}
                    <Button
                      onClick={() => onDeleteGoal(goal.id)}
                      size="icon"
                      variant="ghost"
                      title="Delete goal"
                      className="size-7 text-text/35 hover:text-destructive"
                    >
                      <Trash className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <Progress value={progress} className="h-1.5" />

                <div className="flex items-center justify-between gap-2 text-xs">
                  {isAchieved ? (
                    <span className="text-accent font-medium inline-flex items-center gap-1.5">
                      <PartyPopper className="size-3.5" />
                      Achieved
                    </span>
                  ) : isExpired ? (
                    <span className="text-destructive font-medium inline-flex items-center gap-1.5">
                      <Timer className="size-3.5" />
                      Expired
                    </span>
                  ) : goal.targetDate ? (
                    <span className="text-text/45">
                      {daysRemaining !== null && daysRemaining > 0
                        ? `${daysRemaining} days left`
                        : daysRemaining === 0
                          ? 'Due today'
                          : 'Overdue'}
                    </span>
                  ) : (
                    <span className="text-text/45">No deadline</span>
                  )}
                  <span className="text-text/45 font-mono tabular-nums">
                    {progress.toFixed(0)}%
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
};
