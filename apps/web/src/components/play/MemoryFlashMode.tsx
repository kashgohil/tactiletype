import {
  PlayHud,
  PlayResultCard,
  PlayShell,
  PlayStat,
} from '@/components/play/PlayHud';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts';
import { isNonPrintingKey } from '@/utils/typingEngine';
import { pickPhrase, savePlayBest } from '@/utils/playModes';
import { submitPlayResult } from '@/utils/submitPlayResult';
import { playCompleteChime, playErrorBeep, playKeyClick } from '@/utils/testSounds';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

type Phase = 'ready' | 'flash' | 'type' | 'round-result' | 'over';

const TOTAL_ROUNDS = 5;
const FLASH_MS_BASE = 2800;

function flashDuration(round: number, wordCount: number): number {
  return Math.max(1600, FLASH_MS_BASE + wordCount * 120 - (round - 1) * 200);
}

function wordsForRound(round: number): number {
  return 3 + round; // 4…8
}

function scoreRound(target: string, typed: string): { correct: number; total: number; accuracy: number } {
  const total = target.length;
  let correct = 0;
  for (let i = 0; i < total; i++) {
    if (typed[i] === target[i]) correct++;
  }
  const extras = Math.max(0, typed.length - total);
  const accuracy = total > 0 ? Math.round((correct / (total + extras)) * 100) : 0;
  return { correct, total, accuracy };
}

export const MemoryFlashMode: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>('ready');
  const [round, setRound] = useState(1);
  const [phrase, setPhrase] = useState('');
  const [typed, setTyped] = useState('');
  const [flashLeft, setFlashLeft] = useState(1);
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const [lastRoundAcc, setLastRoundAcc] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [typeStartedAt, setTypeStartedAt] = useState<number | null>(null);
  const [typeMsTotal, setTypeMsTotal] = useState(0);
  const focusRef = useRef<HTMLDivElement>(null);
  const flashTimer = useRef<number | null>(null);
  const flashDeadline = useRef(0);
  const submitted = useRef(false);
  const allPhrases = useRef<string[]>([]);

  const clearFlashTimer = () => {
    if (flashTimer.current) {
      clearInterval(flashTimer.current);
      flashTimer.current = null;
    }
  };

  const startRound = useCallback((r: number) => {
    clearFlashTimer();
    const wc = wordsForRound(r);
    const difficulty = r >= 4 ? 'hard' : r >= 2 ? 'medium' : 'easy';
    const p = pickPhrase(wc, difficulty);
    setPhrase(p);
    setTyped('');
    setPhase('flash');
    setTypeStartedAt(null);
    const dur = flashDuration(r, wc);
    flashDeadline.current = Date.now() + dur;
    setFlashLeft(1);

    flashTimer.current = window.setInterval(() => {
      const left = Math.max(0, (flashDeadline.current - Date.now()) / dur);
      setFlashLeft(left);
      if (left <= 0) {
        clearFlashTimer();
        setPhase('type');
        setTypeStartedAt(Date.now());
        requestAnimationFrame(() => focusRef.current?.focus());
      }
    }, 40);
  }, []);

  const reset = useCallback(() => {
    clearFlashTimer();
    setPhase('ready');
    setRound(1);
    setPhrase('');
    setTyped('');
    setRoundScores([]);
    setLastRoundAcc(0);
    setIsNewBest(false);
    setSessionCorrect(0);
    setSessionTotal(0);
    setTypeStartedAt(null);
    setTypeMsTotal(0);
    submitted.current = false;
    allPhrases.current = [];
  }, []);

  useEffect(() => () => clearFlashTimer(), []);

  const finishRound = useCallback(
    async (finalTyped: string) => {
      const { correct, total, accuracy } = scoreRound(phrase, finalTyped);
      allPhrases.current.push(phrase);
      const scores = [...roundScores, accuracy];
      setRoundScores(scores);
      setLastRoundAcc(accuracy);

      const newCorrect = sessionCorrect + correct;
      const newTotal = sessionTotal + total;
      setSessionCorrect(newCorrect);
      setSessionTotal(newTotal);

      const typedMs = typeStartedAt ? Date.now() - typeStartedAt : 0;
      const newTypeMs = typeMsTotal + typedMs;
      setTypeMsTotal(newTypeMs);

      if (accuracy < 70) playErrorBeep();
      else playKeyClick();

      if (round >= TOTAL_ROUNDS) {
        setPhase('over');
        const avgAcc = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        const wpm =
          newTypeMs > 0 ? Math.round(newCorrect / 5 / (newTypeMs / 60000)) : 0;
        const score = avgAcc * 10 + scores.filter((s) => s === 100).length * 50;
        const isBest = savePlayBest('memory-flash', score, `${avgAcc}% avg recall`);
        setIsNewBest(isBest);

        if (!submitted.current) {
          submitted.current = true;
          await submitPlayResult(
            {
              modeId: 'memory-flash',
              title: `Memory Flash · ${avgAcc}% avg`,
              content: allPhrases.current.join(' · '),
              wpm,
              accuracy: avgAcc,
              errors: Math.max(0, newTotal - newCorrect),
              timeTaken: Math.max(1, Math.round(newTypeMs / 1000)),
              wordCount: allPhrases.current.join(' ').split(/\s+/).filter(Boolean).length,
              score,
              scoreLabel: `${avgAcc}% avg`,
            },
            !!user
          );
        }
        playCompleteChime();
      } else {
        setPhase('round-result');
      }
    },
    [phrase, round, roundScores, sessionCorrect, sessionTotal, typeStartedAt, typeMsTotal, user]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (phase !== 'type') return;
      if (isNonPrintingKey(e.key) && e.key !== 'Backspace' && e.key !== 'Enter') return;
      e.preventDefault();

      if (e.key === 'Enter') {
        void finishRound(typed);
        return;
      }
      if (e.key === 'Backspace') {
        setTyped((t) => t.slice(0, -1));
        return;
      }
      if (e.key.length !== 1) return;

      const next = typed + e.key;
      setTyped(next);
      if (next.length >= phrase.length) {
        void finishRound(next.slice(0, phrase.length));
      }
    },
    [phase, typed, phrase, finishRound]
  );

  const exit = () => navigate({ to: '/play' });

  const avgSoFar =
    roundScores.length > 0
      ? Math.round(roundScores.reduce((a, b) => a + b, 0) / roundScores.length)
      : 0;

  if (phase === 'over') {
    return (
      <PlayShell modeId="memory-flash" title="Memory Flash" onExit={exit}>
        <PlayResultCard
          title={`${avgSoFar}% average recall`}
          isNewBest={isNewBest}
          stats={[
            { label: 'Avg accuracy', value: `${avgSoFar}%` },
            { label: 'Perfect rounds', value: roundScores.filter((s) => s === 100).length },
            { label: 'Rounds', value: TOTAL_ROUNDS },
          ]}
          onRetry={reset}
          onExit={exit}
        />
        <div className="text-center text-sm text-text/40 space-y-1">
          {roundScores.map((s, i) => (
            <p key={i}>
              Round {i + 1}: {s}%
            </p>
          ))}
        </div>
      </PlayShell>
    );
  }

  return (
    <PlayShell modeId="memory-flash"
      title="Memory Flash"
      subtitle="Memorize the phrase, then type it blind. Builds chunking."
      onExit={exit}
    >
      <PlayHud>
        <PlayStat label="Round" value={`${round}/${TOTAL_ROUNDS}`} accent />
        <PlayStat label="Avg so far" value={roundScores.length ? `${avgSoFar}%` : '—'} />
        <PlayStat
          label="Phase"
          value={
            phase === 'ready'
              ? 'Ready'
              : phase === 'flash'
                ? 'Memorize'
                : phase === 'type'
                  ? 'Type'
                  : 'Result'
          }
        />
      </PlayHud>

      {phase === 'ready' && (
        <div className="rounded-2xl border border-accent/20 bg-primary/40 p-10 text-center space-y-4">
          <p className="text-text/60 max-w-md mx-auto leading-relaxed">
            A phrase flashes on screen, then disappears. Type it from memory.
            {TOTAL_ROUNDS} rounds — phrases get longer each time.
          </p>
          <Button
            size="lg"
            onClick={() => {
              setRound(1);
              startRound(1);
            }}
          >
            Start session
          </Button>
        </div>
      )}

      {phase === 'flash' && (
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-10 space-y-6">
          <div className="h-1.5 rounded-full bg-accent/15 overflow-hidden">
            <div
              className="h-full bg-violet-400 rounded-full transition-[width] duration-75"
              style={{ width: `${Math.round(flashLeft * 100)}%` }}
            />
          </div>
          <p className="text-center text-xs uppercase tracking-widest text-violet-300/70">
            Memorize
          </p>
          <p className="font-mono text-xl sm:text-2xl text-center leading-relaxed text-text">
            {phrase}
          </p>
        </div>
      )}

      {phase === 'type' && (
        <div
          ref={focusRef}
          tabIndex={0}
          role="textbox"
          aria-label="Type the memorized phrase"
          onKeyDown={onKeyDown}
          onClick={() => focusRef.current?.focus()}
          className="outline-none rounded-2xl border border-accent/20 bg-primary/40 p-10 min-h-[200px] cursor-text focus:border-accent/50 space-y-4"
        >
          <p className="text-center text-xs uppercase tracking-widest text-text/40">
            Type from memory · Enter to submit early
          </p>
          <p className="font-mono text-xl sm:text-2xl text-center leading-relaxed min-h-[2.5em]">
            {typed.length === 0 && (
              <span className="text-text/25">Start typing what you remember…</span>
            )}
            {typed.split('').map((ch, i) => (
              <span key={i} className="text-text border-b border-accent/40">
                {ch === ' ' ? '\u00A0' : ch}
              </span>
            ))}
            <span className="inline-block w-0.5 h-6 bg-accent align-middle animate-pulse ml-0.5" />
          </p>
          <p className="text-center text-xs text-text/30">
            {typed.length} chars · target was ~{phrase.split(/\s+/).length} words
          </p>
        </div>
      )}

      {phase === 'round-result' && (
        <div className="rounded-2xl border border-accent/25 bg-accent/10 p-10 text-center space-y-4">
          <p className="text-xs uppercase tracking-widest text-text/40">Round {round}</p>
          <p className="text-4xl font-bold font-mono">{lastRoundAcc}%</p>
          <p className="text-sm text-text/50 font-mono max-w-lg mx-auto">{phrase}</p>
          <p className="text-sm text-text/40">
            You typed:{' '}
            <span className="text-text/70 font-mono">{typed || '(empty)'}</span>
          </p>
          <Button
            onClick={() => {
              const next = round + 1;
              setRound(next);
              startRound(next);
            }}
          >
            Next round
          </Button>
        </div>
      )}
    </PlayShell>
  );
};
