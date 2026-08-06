import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { cn } from '@/lib/utils';
import type { UserRecommendation } from '@tactile/types';
import { Target, X } from 'lucide-react';
import React from 'react';

interface RecommendationsPanelProps {
  recommendations: UserRecommendation[];
  onMarkAsRead: (recommendationId: string) => void;
  onMarkAsApplied: (recommendationId: string) => void;
  onDismiss: (recommendationId: string) => void;
}

/**
 * Priority reads through the status tokens, not a five-hue rainbow: only the top
 * two levels earn a colour of their own, the rest sit on the theme's own ramp.
 */
const PRIORITY = [
  { min: 5, label: 'Critical', text: 'text-destructive', dot: 'bg-destructive' },
  { min: 4, label: 'High', text: 'text-warning', dot: 'bg-warning' },
  { min: 3, label: 'Medium', text: 'text-accent', dot: 'bg-accent' },
  { min: 2, label: 'Low', text: 'text-text/50', dot: 'bg-text/30' },
  { min: 0, label: 'Info', text: 'text-text/50', dot: 'bg-text/30' },
] as const;

const priorityOf = (priority: number) =>
  PRIORITY.find((p) => priority >= p.min) ?? PRIORITY[PRIORITY.length - 1];

const ICONS: Record<string, string> = {
  practice_focus: '🎯',
  goal_suggestion: '📈',
  improvement_tip: '💡',
};

export const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  recommendations,
  onMarkAsRead,
  onMarkAsApplied,
  onDismiss,
}) => {
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const isExpired = (recommendation: UserRecommendation) => {
    if (!recommendation.validUntil) return false;
    return new Date(recommendation.validUntil) < new Date();
  };

  // Highest priority first, then newest first.
  const sorted = [...recommendations].sort((a, b) =>
    a.priority !== b.priority
      ? b.priority - a.priority
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const unread = sorted.filter((r) => !r.isRead && !isExpired(r));
  const read = sorted.filter((r) => r.isRead && !isExpired(r));
  const expired = sorted.filter(isExpired);

  const RecommendationCard: React.FC<{
    recommendation: UserRecommendation;
    isExpired?: boolean;
  }> = ({ recommendation, isExpired: expired = false }) => {
    const priority = priorityOf(recommendation.priority);
    const unread = !recommendation.isRead && !expired;

    return (
      // Nested inside a panel, so: no second border, just the tint. Unread is a
      // left rail rather than a ring — it doesn't compete with the panel edge.
      <div
        className={cn(
          'p-4 rounded-lg bg-accent/[0.06] transition-colors',
          unread && 'border-l-2 border-accent',
          expired && 'opacity-55'
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="text-2xl leading-none mt-0.5 shrink-0">
              {ICONS[recommendation.type] ?? '📝'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <h4 className="font-semibold tracking-tight">
                  {recommendation.title}
                </h4>
                {unread && (
                  <span className="bg-accent/20 text-accent text-xs px-2 py-0.5 rounded-full">
                    New
                  </span>
                )}
                {recommendation.isApplied && (
                  <span className="bg-success/15 text-success text-xs px-2 py-0.5 rounded-full">
                    Applied
                  </span>
                )}
              </div>
              <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-2">
                <span className={cn('text-xs font-medium', priority.text)}>
                  {priority.label} priority
                </span>
                <span className="text-xs text-text/45">
                  {formatDate(recommendation.createdAt)}
                </span>
                {recommendation.validUntil && (
                  <span
                    className={cn(
                      'text-xs',
                      expired ? 'text-destructive' : 'text-text/45'
                    )}
                  >
                    {expired
                      ? 'Expired'
                      : `Valid until ${formatDate(recommendation.validUntil)}`}
                  </span>
                )}
              </div>
              <p className="text-text/60 text-sm leading-relaxed">
                {recommendation.description}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDismiss(recommendation.id)}
            title="Dismiss"
            aria-label="Dismiss recommendation"
            className="shrink-0"
          >
            <X />
          </Button>
        </div>

        {!expired && (
          <div className="flex items-center flex-wrap gap-2">
            {!recommendation.isRead && (
              <Button size="sm" onClick={() => onMarkAsRead(recommendation.id)}>
                Mark as read
              </Button>
            )}

            {recommendation.isRead && !recommendation.isApplied && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onMarkAsApplied(recommendation.id)}
              >
                Mark as applied
              </Button>
            )}

            {recommendation.type === 'practice_focus' &&
              recommendation.actionData && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // TODO: Navigate to practice session with specific focus
                    console.log(
                      'Start practice session:',
                      recommendation.actionData
                    );
                  }}
                >
                  Start practice
                </Button>
              )}

            {recommendation.type === 'goal_suggestion' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // TODO: Open goal creation modal with pre-filled data
                  console.log(
                    'Create goal from recommendation:',
                    recommendation.actionData
                  );
                }}
              >
                Set goal
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  const Group: React.FC<{
    title: string;
    dot: string;
    items: UserRecommendation[];
    expired?: boolean;
    footer?: React.ReactNode;
  }> = ({ title, dot, items, expired, footer }) => (
    <div>
      <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-text/45 mb-3 flex items-center gap-2">
        <span className={cn('size-1.5 rounded-full', dot)} />
        {title} ({items.length})
      </h4>
      <div className="space-y-3">
        {items.map((recommendation) => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
            isExpired={expired}
          />
        ))}
        {footer}
      </div>
    </div>
  );

  return (
    <Panel
      title="Personalized recommendations"
      action={<span className="text-sm text-text/45">{unread.length} new</span>}
    >
      <div className="space-y-6">
        {unread.length > 0 && (
          <Group title="New" dot="bg-accent" items={unread} />
        )}

        {read.length > 0 && (
          <Group
            title="Previous"
            dot="bg-text/30"
            items={read.slice(0, 5)}
            footer={
              read.length > 5 ? (
                <div className="text-center">
                  <Button variant="link" size="sm">
                    Show {read.length - 5} more
                  </Button>
                </div>
              ) : null
            }
          />
        )}

        {expired.length > 0 && (
          <Group
            title="Expired"
            dot="bg-destructive"
            items={expired.slice(0, 3)}
            expired
          />
        )}

        {recommendations.length === 0 && (
          <div className="text-center py-8 text-text/50">
            <Target className="mx-auto mb-4 h-12 w-12 text-accent" />
            <p className="text-lg font-medium mb-1">No recommendations yet</p>
            <p className="text-sm">
              Complete more typing tests to get personalized improvement
              suggestions.
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
};
