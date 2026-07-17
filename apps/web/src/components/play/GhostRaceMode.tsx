import {
  PlayHud,
  PlayResultCard,
  PlayShell,
  PlayStat,
} from '@/components/play/PlayHud';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts';
import { cn } from '@/lib/utils';
import { isNonPrintingKey } from '@/utils/typingEngine';
import {
  charsForGhostWpm,
  GHOST_PACES,
  pickPassage,
  savePlayBest,
} from '@/utils/playModes';
import { isActiveDailyForMode, peekDailyRun } from '@/utils/dailyRun';
import { submitPlayResult } from '@/utils/submitPlayResult';
import { playCompleteChime, playErrorBeep, playKeyClick } from '@/utils/testSounds';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

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

  const reset = useCallback((targetPace = pace) => {
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
  }, [pace, isDaily, dailyPace]);

  useEffect(() => {
    reset(dailyPace ?? pace);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
              playerIndex > 0
                ? Math.round(((playerIndex - errSet.size) / playerIndex) * 100)
                : 100,
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

  return (
    <PlayShell modeId="ghost-race"
      title="Ghost Race"
      subtitle="Stay ahead of the pace caret. Beat the ghost to win."
      onExit={exit}
    >
      <PlayHud>
        <PlayStat label="You" value={phase === 'racing' ? liveWpm : '—'} accent />
        <PlayStat label="Ghost" value={`${pace} WPM`} />
        <PlayStat label="Progress" value={`${Math.round(progressPlayer * 100)}%`} />
        <PlayStat label="Lead" value={index - ghostIndex} />
      </PlayHud>

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
                  ? 'border-sky-400/60 bg-sky-400/15 text-text'
                  : 'border-accent/20 text-text/50 hover:border-accent/40'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}
      {isDaily && phase === 'ready' && (
        <p className="text-center text-xs text-sky-300/80 font-mono">
          Daily mode · fixed ghost at {pace} WPM
        </p>
      )}

      {/* Dual progress track */}
      <div className="space-y-2 px-1">
        <div className="relative h-3 rounded-full bg-accent/10 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-accent/70 rounded-full transition-[width] duration-75"
            style={{ width: `${progressPlayer * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.7)] transition-[left] duration-75"
            style={{ left: `calc(${progressGhost * 100}% - 5px)` }}
            title="Ghost"
          />
        </div>
        <div className="flex justify-between text-[10px] uppercase tracking-wider text-text/35">
          <span>You (fill)</span>
          <span>Ghost (dot)</span>
        </div>
      </div>

      <div
        ref={focusRef}
        tabIndex={0}
        role="textbox"
        aria-label="Ghost race typing area"
        onKeyDown={onKeyDown}
        onClick={() => focusRef.current?.focus()}
        className="outline-none rounded-2xl border border-accent/18 bg-primary/35 p-6 sm:p-8 min-h-[180px] cursor-text relative transition-[border-color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:border-accent/45 focus-visible:shadow-[0_0_0_3px_rgba(128,128,128,0.1)]"
      >
        <p className="font-mono text-lg sm:text-xl leading-relaxed flex flex-wrap">
          {passage.split('').map((ch, i) => {
            let cls = 'text-text/35';
            if (i < index) {
              cls = errors.has(i)
                ? 'text-rose-500 bg-rose-500/15'
                : 'text-text border-b border-accent/40';
            } else if (i === index) {
              cls = 'text-text/60 bg-accent/30';
            }
            // Ghost caret mark
            const isGhost = i === ghostIndex && phase === 'racing';
            return (
              <span
                key={i}
                className={cn(cls, isGhost && 'outline outline-1 outline-sky-400/80 rounded-sm')}
              >
                {ch === ' ' ? '\u00A0' : ch}
              </span>
            );
          })}
        </p>
        {phase === 'ready' && (
          <p className="mt-6 text-center text-sm text-text/40">
            Pick a pace, then type to race the ghost
          </p>
        )}
      </div>

      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={() => reset()}>
          Restart
        </Button>
      </div>
    </PlayShell>
  );
};
