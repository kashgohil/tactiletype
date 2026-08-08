import { useNavigate } from '@tanstack/react-router';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PlayResultCard, PlayShell } from '@/components/play/PlayHud';
import { PanelHint, PlayTestPanel } from '@/components/play/PlayTestPanel';
import { type CharStatus, TypingSurface } from '@/components/test/TypingSurface';
import { useAuth } from '@/contexts';
import { cn } from '@/lib/utils';
import { isActiveDailyForMode, peekDailyRun } from '@/utils/dailyRun';
import { charsForGhostWpm, GHOST_PACES, pickPassage, savePlayBest } from '@/utils/playModes';
import { submitPlayResult } from '@/utils/submitPlayResult';
import { playCompleteChime, playErrorBeep, playKeyClick } from '@/utils/testSounds';
import { isNonPrintingKey } from '@/utils/typingEngine';

type Phase = 'ready' | 'racing' | 'won' | 'lost';

const PASSAGE_WORDS = 35;

function wpmFrom(correctChars: number, startMs: number | null, endMs: number): number {
  if (!startMs) return 0;
  const mins = (endMs - startMs) / 60000;
  if (mins <= 0) return 0;
  return Math.round(correctChars / 5 / mins);
}

export const GhostRaceMode: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDaily = useMemo(() => isActiveDailyForMode('ghost-race'), []);
  const dailyPace = useMemo(() => peekDailyRun()?.ghostPace ?? null, []);
  const [pace, setPace] = useState<number>(dailyPace ?? 60);
  const [phase, setPhase] = useState<Phase>('ready');
  const [passage, setPassage] = useState('');
  const [index, setIndex] = useState(0);
  const [errors, setErrors] = useState<Set<number>>(new Set());
  const [ghostIndex, setGhostIndex] = useState(0);
  const [liveWpm, setLiveWpm] = useState(0);
  const [finalWpm, setFinalWpm] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [margin, setMargin] = useState(0); // chars ahead of ghost at finish
  const startMs = useRef<number | null>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const submitted = useRef(false);
  const errorCount = useRef(0);

  const reset = useCallback(
    (targetPace = pace) => {
      setPassage(pickPassage(PASSAGE_WORDS, 'medium'));
      setIndex(0);
      setErrors(new Set());
      setGhostIndex(0);
      setLiveWpm(0);
      setFinalWpm(0);
      setPhase('ready');
      setIsNewBest(false);
      setMargin(0);
      startMs.current = null;
      submitted.current = false;
      errorCount.current = 0;
      setPace(isDaily && dailyPace ? dailyPace : targetPace);
      requestAnimationFrame(() => focusRef.current?.focus());
    },
    [pace, isDaily, dailyPace]
  );

  useEffect(() => {
    reset(dailyPace ?? pace);
  }, []);

  const finish = useCallback(
    async (won: boolean, playerIndex: number, gIndex: number, errSet: Set<number>) => {
      setPhase(won ? 'won' : 'lost');
      const end = Date.now();
      const correct = playerIndex - errSet.size;
      const wpm = wpmFrom(Math.max(0, correct), startMs.current, end);
      setFinalWpm(wpm);
      setLiveWpm(wpm);
      setMargin(playerIndex - gIndex);

      if (won) playCompleteChime();
      else playErrorBeep();

      // Score: win bonus + how much you beat the target pace
      const score = (won ? 10000 : 0) + wpm * 10 + Math.max(0, playerIndex - gIndex);
      if (won) {
        const isBest = savePlayBest('ghost-race', score, `${wpm} WPM vs ${pace} ghost`);
        setIsNewBest(isBest);
      }

      if (!submitted.current) {
        submitted.current = true;
        const elapsed = startMs.current ? Math.round((end - startMs.current) / 1000) : 1;
        await submitPlayResult(
          {
            modeId: 'ghost-race',
            title: `Ghost Race · ${won ? 'Win' : 'Loss'} vs ${pace} WPM`,
            content: passage,
            wpm,
            accuracy:
              playerIndex > 0 ? Math.round(((playerIndex - errSet.size) / playerIndex) * 100) : 100,
            errors: errSet.size,
            timeTaken: Math.max(1, elapsed),
            wordCount: PASSAGE_WORDS,
            score,
            scoreLabel: won ? `Beat ${pace}` : `Lost to ${pace}`,
          },
          !!user
        );
      }
    },
    [pace, passage, user]
  );

  // Ghost advance + live WPM
  useEffect(() => {
    if (phase !== 'racing' || !startMs.current) return;
    const id = window.setInterval(() => {
      const elapsed = Date.now() - (startMs.current ?? Date.now());
      const g = Math.min(passage.length, charsForGhostWpm(pace, elapsed));
      setGhostIndex(g);

      const correct = index - errors.size;
      setLiveWpm(wpmFrom(Math.max(0, correct), startMs.current, Date.now()));

      // Ghost finished first
      if (g >= passage.length && index < passage.length) {
        void finish(false, index, g, errors);
      }
    }, 50);
    return () => clearInterval(id);
  }, [phase, pace, passage, index, errors, finish]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (phase === 'won' || phase === 'lost') return;
      if (isNonPrintingKey(e.key) && e.key !== 'Backspace') return;
      e.preventDefault();

      if (phase === 'ready' && e.key.length === 1) {
        setPhase('racing');
        startMs.current = Date.now();
      }
      if (phase !== 'racing' && !(phase === 'ready' && e.key.length === 1)) return;

      if (e.key === 'Backspace') {
        if (index > 0) {
          const prev = index - 1;
          setIndex(prev);
          setErrors((prevSet) => {
            const next = new Set(prevSet);
            next.delete(prev);
            return next;
          });
        }
        return;
      }
      if (e.key.length !== 1) return;

      const expected = passage[index];
      const nextIndex = index + 1;
      const nextErrors = new Set(errors);
      if (e.key !== expected) {
        nextErrors.add(index);
        errorCount.current += 1;
        playErrorBeep();
      } else {
        playKeyClick();
      }
      setErrors(nextErrors);
      setIndex(nextIndex);

      if (nextIndex >= passage.length) {
        // Check if still ahead of ghost
        const elapsed = startMs.current ? Date.now() - startMs.current : 0;
        const g = Math.min(passage.length, charsForGhostWpm(pace, elapsed));
        void finish(nextIndex > g || g < passage.length, nextIndex, g, nextErrors);
      }
    },
    [phase, index, passage, errors, pace, finish]
  );

  const exit = () => navigate({ to: '/play' });

  if (phase === 'won' || phase === 'lost') {
    return (
      <PlayShell modeId="ghost-race" title="Ghost Race" onExit={exit}>
        <PlayResultCard
          title={phase === 'won' ? 'You beat the ghost' : 'Ghost finished first'}
          isNewBest={isNewBest}
          stats={[
            { label: 'Your WPM', value: finalWpm },
            { label: 'Ghost', value: pace },
            { label: 'Margin', value: margin >= 0 ? `+${margin}` : margin },
            { label: 'Errors', value: errors.size },
          ]}
          onRetry={() => reset()}
          onExit={exit}
        />
      </PlayShell>
    );
  }

  const progressPlayer = passage.length ? index / passage.length : 0;
  const progressGhost = passage.length ? ghostIndex / passage.length : 0;

  // The race advances past mistakes, so status comes from the error set rather
  // than a diff against what was typed.
  const charStatus = (i: number): CharStatus => {
    if (i < index) return errors.has(i) ? 'incorrect' : 'correct';
    if (i === index) return 'current';
    return 'pending';
  };

  return (
    <PlayShell
      modeId="ghost-race"
      title="Ghost Race"
      subtitle="Stay ahead of the pace caret. Beat the ghost to win."
      onExit={exit}
    >
      {phase === 'ready' && !isDaily && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-text/40 uppercase tracking-wider mr-1">Ghost pace</span>
          {GHOST_PACES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => reset(p)}
              className={cn(
                'text-sm px-3 py-1 rounded-full border transition-colors font-mono',
                pace === p
                  ? 'border-ghost/60 bg-ghost/15 text-text'
                  : 'border-accent/15 text-text/50 hover:border-accent/30'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}
      {isDaily && phase === 'ready' && (
        <p className="text-center text-xs text-ghost/80 font-mono">
          Daily mode · fixed ghost at {pace} WPM
        </p>
      )}

      <PlayTestPanel
        stats={[
          {
            label: 'You',
            value: phase === 'racing' ? liveWpm : '\u2014',
            accent: true,
          },
          { label: 'Ghost', value: pace },
          { label: 'Progress', value: `${Math.round(progressPlayer * 100)}%` },
          {
            label: 'Lead',
            value: index - ghostIndex,
            tone: index < ghostIndex ? 'danger' : 'default',
          },
        ]}
        meter={progressPlayer}
        meterActive={phase === 'racing'}
        onRestart={() => reset()}
      >
        {/* Ghost's position on the same rail as your fill */}
        <div className="mx-8 -mt-1 h-1 relative">
          <div
            className="absolute top-1/2 -translate-y-1/2 size-2 rounded-full bg-ghost shadow-[0_0_8px_var(--color-ghost)] transition-[left] duration-75"
            style={{ left: `calc(${progressGhost * 100}% - 4px)` }}
            title="Ghost"
          />
        </div>

        <TypingSurface
          text={passage}
          getStatus={charStatus}
          caretIndex={index}
          onKeyDown={onKeyDown}
          surfaceRef={focusRef}
          ariaLabel="Ghost race typing area"
          markers={
            phase === 'racing'
              ? [
                  {
                    index: ghostIndex,
                    className: 'bg-ghost border-ghost',
                    title: 'Ghost',
                  },
                ]
              : undefined
          }
        />
        {phase === 'ready' && <PanelHint>Pick a pace, then type to race the ghost</PanelHint>}
      </PlayTestPanel>
    </PlayShell>
  );
};
