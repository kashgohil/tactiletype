import type { AchievementItem } from '@/services/challengesApi';
import { Award } from 'lucide-react';
import React from 'react';
import { Skeleton } from '../ui/skeleton';

interface AchievementsPanelProps {
  achievements: AchievementItem[];
  isLoading?: boolean;
}

const rarityColor: Record<string, string> = {
  common: 'border-text/20',
  rare: 'border-blue-400/50',
  epic: 'border-purple-400/50',
  legendary: 'border-amber-400/60',
};

export const AchievementsPanel: React.FC<AchievementsPanelProps> = ({
  achievements,
  isLoading,
}) => {
  if (isLoading) {
    return <Skeleton className="h-40 rounded-xl" />;
  }

  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <section className="bg-accent/10 rounded-xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Award className="size-5 text-accent" />
          Achievements
        </h2>
        <span className="text-xs text-text/40 font-mono">
          {unlocked}/{achievements.length}
        </span>
      </div>

      {achievements.length === 0 ? (
        <p className="text-sm text-text/50">
          Seed the database to load starter badges, then keep practicing.
        </p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-2">
          {achievements.map((a) => (
            <li
              key={a.id}
              className={`rounded-lg border px-3 py-2.5 ${
                rarityColor[a.rarity] ?? rarityColor.common
              } ${a.unlocked ? 'bg-accent/15' : 'opacity-50 bg-primary/20'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm">{a.name}</p>
                <span className="text-[10px] uppercase text-text/40 shrink-0">
                  {a.rarity}
                </span>
              </div>
              <p className="text-xs text-text/50 mt-0.5 leading-relaxed">
                {a.description}
              </p>
              <p className="text-[10px] text-text/40 mt-1 font-mono">
                {a.points} pts
                {a.unlocked ? ' · unlocked' : ' · locked'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
