import { Award, Check, Lock } from 'lucide-react';
import type React from 'react';
import { Panel } from '@/components/ui/panel';
import { cn } from '@/lib/utils';
import type { AchievementItem } from '@/services/challengesApi';
import { Skeleton } from '../ui/skeleton';

interface AchievementsPanelProps {
  achievements: AchievementItem[];
  isLoading?: boolean;
}

/** Rarity reads as a dot, not a border — badges sit flat on the panel. */
const rarityDot: Record<string, string> = {
  common: 'bg-text/25',
  rare: 'bg-accent/50',
  epic: 'bg-accent/75',
  legendary: 'bg-accent',
};

export const AchievementsPanel: React.FC<AchievementsPanelProps> = ({
  achievements,
  isLoading,
}) => {
  if (isLoading) {
    return <Skeleton className="h-40 rounded-2xl" />;
  }

  const unlocked = achievements.filter((a) => a.unlocked).length;
  // Earned first — a wall of locked rows buries what the user actually did.
  const ordered = [...achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));

  return (
    <Panel
      title="Achievements"
      icon={<Award className="size-4 text-accent" />}
      action={
        <span className="text-xs text-text/40 font-mono tabular-nums">
          {unlocked}/{achievements.length}
        </span>
      }
    >
      {achievements.length === 0 ? (
        <p className="text-sm text-text/50">
          Seed the database to load starter badges, then keep practicing.
        </p>
      ) : (
        <ul className="divide-y divide-accent/10 -my-2.5">
          {ordered.map((a) => (
            <li
              key={a.id}
              className={cn('flex items-start gap-3 py-2.5', !a.unlocked && 'opacity-45')}
            >
              <span
                className={cn(
                  'mt-1.5 size-2 rounded-full shrink-0',
                  rarityDot[a.rarity] ?? rarityDot.common
                )}
                title={a.rarity}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium text-sm truncate">{a.name}</p>
                  <span className="text-[10px] text-text/40 font-mono shrink-0 tabular-nums">
                    {a.points} pts
                  </span>
                </div>
                <p className="text-xs text-text/45 mt-0.5 leading-relaxed">{a.description}</p>
              </div>
              {a.unlocked ? (
                <Check className="size-3.5 text-accent shrink-0 mt-1" />
              ) : (
                <Lock className="size-3.5 text-text/30 shrink-0 mt-1" />
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};
