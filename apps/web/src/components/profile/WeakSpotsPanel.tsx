import type { ErrorAnalysisSummary } from '@tactile/types';
import { Crosshair } from 'lucide-react';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Skeleton } from '../ui/skeleton';

interface WeakSpotsPanelProps {
  errorAnalysis?: ErrorAnalysisSummary | null;
  isLoading?: boolean;
}

export const WeakSpotsPanel: React.FC<WeakSpotsPanelProps> = ({ errorAnalysis, isLoading }) => {
  if (isLoading) {
    return <Skeleton className="h-48 rounded-2xl" />;
  }

  const chars = errorAnalysis?.mostProblematicChars?.slice(0, 8) ?? [];
  const words = errorAnalysis?.mostProblematicWords?.slice(0, 5) ?? [];

  return (
    <Panel
      title="Weak spots"
      icon={<Crosshair className="size-4 text-accent" />}
      description="From recent error analytics — one click starts a drill."
      bodyClassName="flex flex-col"
    >
      {chars.length === 0 && words.length === 0 ? (
        <p className="text-sm text-text/50 flex-1">
          Complete a few tests to surface weak keys and words. Analytics need keystroke data from
          finished sessions.
        </p>
      ) : (
        <div className="space-y-4 flex-1">
          {chars.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-text/40 mb-2">Keys</p>
              <div className="flex flex-wrap gap-2">
                {chars.map((c) => (
                  <a
                    key={c.character}
                    href={`/practice?drill=keys&keys=${encodeURIComponent(c.character)}`}
                    className="inline-flex items-center gap-1.5 font-mono text-sm bg-accent/20 hover:bg-accent/30 px-2.5 py-1 rounded-md transition-colors"
                  >
                    <span className="text-accent font-bold">
                      {c.character === ' ' ? '␣' : c.character}
                    </span>
                    <span className="text-text/40 text-xs">{c.errorCount}×</span>
                  </a>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button size="sm" asChild>
                  <a href="/play/weak-storm">Weak Storm</a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a
                    href={`/practice?drill=keys&keys=${encodeURIComponent(
                      chars.map((c) => c.character).join(',')
                    )}`}
                  >
                    Classic key drill
                  </a>
                </Button>
              </div>
            </div>
          )}

          {words.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-text/40 mb-2">Words</p>
              <div className="flex flex-wrap gap-2">
                {words.map((w) => (
                  <a
                    key={w.word}
                    href={`/practice?drill=words&words=${encodeURIComponent(w.word)}`}
                    className="text-sm bg-primary/40 hover:bg-primary/60 px-2.5 py-1 rounded-md transition-colors"
                  >
                    {w.word}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
};
