import type { UserRecommendation } from '@tactile/types';
import { Target } from 'lucide-react';
import React from 'react';

interface RecommendationsPanelProps {
  recommendations: UserRecommendation[];
  onMarkAsRead: (recommendationId: string) => void;
  onMarkAsApplied: (recommendationId: string) => void;
  onDismiss: (recommendationId: string) => void;
}

export const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  recommendations,
  onMarkAsRead,
  onMarkAsApplied,
  onDismiss,
}) => {
  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'practice_focus':
        return '🎯';
      case 'goal_suggestion':
        return '📈';
      case 'improvement_tip':
        return '💡';
      default:
        return '📝';
    }
  };

  const getRecommendationColor = (priority: number) => {
    if (priority >= 5)
      return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
    if (priority >= 4)
      return 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20';
    if (priority >= 3)
      return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
    if (priority >= 2)
      return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
    return 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 5)
      return { label: 'Critical', color: 'text-red-600 dark:text-red-400' };
    if (priority >= 4)
      return { label: 'High', color: 'text-orange-600 dark:text-orange-400' };
    if (priority >= 3)
      return { label: 'Medium', color: 'text-yellow-600 dark:text-yellow-400' };
    if (priority >= 2)
      return { label: 'Low', color: 'text-blue-600 dark:text-blue-400' };
    return { label: 'Info', color: 'text-gray-600 dark:text-gray-400' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (recommendation: UserRecommendation) => {
    if (!recommendation.validUntil) return false;
    return new Date(recommendation.validUntil) < new Date();
  };

  // Sort recommendations by priority (highest first) and then by creation date
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Group recommendations by read status
  const unreadRecommendations = sortedRecommendations.filter(
    (r) => !r.isRead && !isExpired(r)
  );
  const readRecommendations = sortedRecommendations.filter(
    (r) => r.isRead && !isExpired(r)
  );
  const expiredRecommendations = sortedRecommendations.filter((r) =>
    isExpired(r)
  );

  const RecommendationCard: React.FC<{
    recommendation: UserRecommendation;
    isExpired?: boolean;
  }> = ({ recommendation, isExpired: expired = false }) => {
    const priorityInfo = getPriorityLabel(recommendation.priority);

    return (
      <div
        className={`p-4 rounded-lg border-2 transition-all ${
          expired
            ? 'border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800 opacity-60'
            : getRecommendationColor(recommendation.priority)
        } ${!recommendation.isRead && !expired ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-3">
            <div className="text-2xl mt-1">
              {getRecommendationIcon(recommendation.type)}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {recommendation.title}
                </h4>
                {!recommendation.isRead && !expired && (
                  <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
                    New
                  </span>
                )}
                {recommendation.isApplied && (
                  <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs px-2 py-1 rounded-full">
                    Applied
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 mb-2">
                <span className={`text-xs font-medium ${priorityInfo.color}`}>
                  {priorityInfo.label} Priority
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(recommendation.createdAt)}
                </span>
                {recommendation.validUntil && (
                  <span
                    className={`text-xs ${expired ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    {expired
                      ? 'Expired'
                      : `Valid until ${formatDate(recommendation.validUntil)}`}
                  </span>
                )}
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                {recommendation.description}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 ml-2">
            <button
              onClick={() => onDismiss(recommendation.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        {!expired && (
          <div className="flex items-center space-x-2">
            {!recommendation.isRead && (
              <button
                onClick={() => onMarkAsRead(recommendation.id)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors"
              >
                Mark as Read
              </button>
            )}

            {recommendation.isRead && !recommendation.isApplied && (
              <button
                onClick={() => onMarkAsApplied(recommendation.id)}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors"
              >
                Mark as Applied
              </button>
            )}

            {recommendation.type === 'practice_focus' &&
              recommendation.actionData && (
                <button
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs transition-colors"
                  onClick={() => {
                    // TODO: Navigate to practice session with specific focus
                    console.log(
                      'Start practice session:',
                      recommendation.actionData
                    );
                  }}
                >
                  Start Practice
                </button>
              )}

            {recommendation.type === 'goal_suggestion' && (
              <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs transition-colors"
                onClick={() => {
                  // TODO: Open goal creation modal with pre-filled data
                  console.log(
                    'Create goal from recommendation:',
                    recommendation.actionData
                  );
                }}
              >
                Set Goal
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-accent/10 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Personalized Recommendations</h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {unreadRecommendations.length} new
        </div>
      </div>

      <div className="space-y-6">
        {/* New Recommendations */}
        {unreadRecommendations.length > 0 && (
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3 flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              New Recommendations ({unreadRecommendations.length})
            </h4>
            <div className="space-y-3">
              {unreadRecommendations.map((recommendation) => (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                />
              ))}
            </div>
          </div>
        )}

        {/* Read Recommendations */}
        {readRecommendations.length > 0 && (
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3 flex items-center">
              <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
              Previous Recommendations ({readRecommendations.length})
            </h4>
            <div className="space-y-3">
              {readRecommendations.slice(0, 5).map((recommendation) => (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                />
              ))}
              {readRecommendations.length > 5 && (
                <div className="text-center">
                  <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                    Show {readRecommendations.length - 5} more
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Expired Recommendations */}
        {expiredRecommendations.length > 0 && (
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3 flex items-center">
              <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
              Expired ({expiredRecommendations.length})
            </h4>
            <div className="space-y-3">
              {expiredRecommendations.slice(0, 3).map((recommendation) => (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  isExpired
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {recommendations.length === 0 && (
          <div className="text-center py-8 text-text/50">
            <Target className="mx-auto mb-4 h-12 w-12 text-accent" />
            <p className="text-lg font-medium mb-1">No recommendations yet</p>
            <p className="text-sm">
              Complete more typing tests to get personalized improvement
              suggestions!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
