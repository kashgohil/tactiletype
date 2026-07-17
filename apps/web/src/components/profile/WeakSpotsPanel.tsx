import { Button } from '@/components/ui/button';
import type { ErrorAnalysisSummary } from '@tactile/types';
import { Crosshair } from 'lucide-react';
import React from 'react';
import { Skeleton } from '../ui/skeleton';

interface WeakSpotsPanelProps {
  errorAnalysis?: ErrorAnalysisSummary | null;
  isLoading?: boolean;
}

export const WeakSpotsPanel: React.FC<WeakSpotsPanelProps> = ({
  errorAnalysis,
  isLoading,
}) => {
  if (isLoading) {
    return <Skeleton className="h-48 rounded-xl" />;
  }

  const chars = errorAnalysis?.mostProblematicChars?.slice(0, 8) ?? [];
  const words = errorAnalysis?.mostProblematicWords?.slice(0, 5) ?? [];

  return (
    <section className="bg-accent/10 rounded-xl p-5 md:p-6 h-full flex flex-col">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
        <Crosshair className="size-5 text-accent" />
        Weak spots
      </h2>
      <p className="text-xs text-text/40 mb-4">
        From recent error analytics — one click starts a drill.
      </p>

      {chars.length === 0 && words.length === 0 ? (
        <p className="text-sm text-text/50 flex-1">
          Complete a few tests to surface weak keys and words. Analytics need
          keystroke data from finished sessions.
        </p>
      ) : (
        <div className="space-y-4 flex-1">
          {chars.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-text/40 mb-2">
                Keys
              </p>
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
                    <span className="text-text/40 text-xs">
                      {c.errorCount}×
                    </span>
                  </a>
                ))}
              </div>
              <Button size="sm" className="mt-3" asChild>
                <a
                  href={`/practice?drill=keys&keys=${encodeURIComponent(
                    chars.map((c) => c.character).join(',')
                  )}`}
                >
                  Drill all weak keys
                </a>
              </Button>
            </div>
          )}

          {words.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-text/40 mb-2">
                Words
              </p>
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
    </section>
  );
};
