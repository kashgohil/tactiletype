import type { UserGoal } from '@tactile/types';
import { Target } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '../ui/button';

interface GoalTrackerProps {
  goals: UserGoal[];
  onCreateGoal: (goalData: {
    goalType: 'wpm' | 'accuracy' | 'consistency' | 'daily_tests';
    targetValue: number;
    targetDate?: string;
  }) => void;
  onDeleteGoal: (goalId: string) => void;
}

export const GoalTracker: React.FC<GoalTrackerProps> = ({
  goals,
  onCreateGoal,
  onDeleteGoal,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    goalType: 'wpm' as 'wpm' | 'accuracy' | 'consistency' | 'daily_tests',
    targetValue: 0,
    targetDate: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGoal.targetValue > 0) {
      onCreateGoal({
        ...newGoal,
        targetDate: newGoal.targetDate || undefined,
      });
      setNewGoal({
        goalType: 'wpm',
        targetValue: 0,
        targetDate: '',
      });
      setShowCreateForm(false);
    }
  };

  const getGoalIcon = (goalType: string) => {
    switch (goalType) {
      case 'wpm':
        return '⚡';
      case 'accuracy':
        return '🎯';
      case 'consistency':
        return '📊';
      case 'daily_tests':
        return '📅';
      default:
        return '🎯';
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

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-gray-400';
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
    <div className="bg-accent/10 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Your Goals</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'Add Goal'}
        </Button>
      </div>

      {/* Create Goal Form */}
      {showCreateForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Goal Type
              </label>
              <select
                value={newGoal.goalType}
                onChange={(e) =>
                  setNewGoal({
                    ...newGoal,
                    goalType: e.target.value as
                      | 'wpm'
                      | 'accuracy'
                      | 'consistency'
                      | 'daily_tests',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="wpm">Words Per Minute</option>
                <option value="accuracy">Accuracy</option>
                <option value="consistency">Consistency</option>
                <option value="daily_tests">Daily Tests</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Value
              </label>
              <input
                type="number"
                value={newGoal.targetValue || ''}
                onChange={(e) =>
                  setNewGoal({
                    ...newGoal,
                    targetValue: Number(e.target.value),
                  })
                }
                placeholder={`Enter target ${getGoalUnit(newGoal.goalType).trim()}`}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Date (Optional)
              </label>
              <input
                type="date"
                value={newGoal.targetDate}
                onChange={(e) =>
                  setNewGoal({ ...newGoal, targetDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Create Goal
            </button>
          </div>
        </form>
      )}

      {/* Goals List */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <div className="text-center py-8 text-text/50">
            <Target className="text-accent mx-auto mb-4 h-12 w-12" />
            <p>
              No goals set yet. Create your first goal to start tracking
              progress!
            </p>
          </div>
        ) : (
          goals.map((goal) => {
            const progress = calculateProgress(goal);
            const daysRemaining = getDaysRemaining(goal);
            const isExpired = isGoalExpired(goal);
            const isAchieved = goal.isAchieved || progress >= 100;

            return (
              <div
                key={goal.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isAchieved
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                    : isExpired
                      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                      : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{getGoalIcon(goal.goalType)}</div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white capitalize">
                        {goal.goalType.replace('_', ' ')} Goal
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Target: {Number(goal.targetValue)}
                        {getGoalUnit(goal.goalType)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isAchieved && (
                      <div className="text-green-600 dark:text-green-400 text-xl">
                        🏆
                      </div>
                    )}
                    <button
                      onClick={() => onDeleteGoal(goal.id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                      title="Delete goal"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>
                      Current: {Number(goal.currentValue)}
                      {getGoalUnit(goal.goalType)}
                    </span>
                    <span>{progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Goal Status */}
                <div className="flex items-center justify-between text-sm">
                  <div>
                    {isAchieved ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        🎉 Goal Achieved!
                      </span>
                    ) : isExpired ? (
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        ⏰ Goal Expired
                      </span>
                    ) : goal.targetDate ? (
                      <span className="text-gray-600 dark:text-gray-400">
                        {daysRemaining !== null && daysRemaining > 0
                          ? `${daysRemaining} days remaining`
                          : daysRemaining === 0
                            ? 'Due today'
                            : 'Overdue'}
                      </span>
                    ) : (
                      <span className="text-gray-600 dark:text-gray-400">
                        No deadline
                      </span>
                    )}
                  </div>

                  {goal.targetDate && (
                    <span className="text-gray-500 dark:text-gray-400">
                      Due: {new Date(goal.targetDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
