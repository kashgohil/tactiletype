import { PlayResultCard, PlayShell } from '@/components/play/PlayHud';
import {
  Kbd,
  PanelHint,
  PlayTestPanel,
} from '@/components/play/PlayTestPanel';
import { TypingSurface } from '@/components/test/TypingSurface';
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
      <PlayTestPanel
        stats={[
          { label: 'Round', value: `${round}/${TOTAL_ROUNDS}`, accent: true },
          {
            label: 'Avg so far',
            value: roundScores.length ? `${avgSoFar}%` : '—',
          },
          {
            label: 'Phase',
            value:
              phase === 'ready'
                ? 'Ready'
                : phase === 'flash'
                  ? 'Memorize'
                  : phase === 'type'
                    ? 'Type'
                    : 'Result',
          },
        ]}
        meter={phase === 'flash' ? flashLeft : null}
        meterActive={phase === 'flash'}
        actions={
          phase === 'ready' ? (
            <Button
              size="sm"
              onClick={() => {
                setRound(1);
                startRound(1);
              }}
            >
              Start session
            </Button>
          ) : phase === 'round-result' ? (
            <Button
              size="sm"
              onClick={() => {
                const next = round + 1;
                setRound(next);
                startRound(next);
              }}
            >
              Next round
            </Button>
          ) : undefined
        }
        onRestart={phase === 'ready' ? undefined : reset}
      >
        {phase === 'ready' && (
          <div className="px-8 pb-10 pt-1 text-center">
            <p className="text-text/60 max-w-md mx-auto leading-relaxed">
              A phrase flashes on screen, then disappears. Type it back from
              memory. {TOTAL_ROUNDS} rounds — the phrases get longer each time.
            </p>
          </div>
        )}

        {phase === 'flash' && (
          <>
            <TypingSurface
              text={phrase}
              getStatus={() => 'correct'}
              caretIndex={null}
              surfaceRef={focusRef}
              ariaLabel="Phrase to memorize"
              interactive={false}
              center
            />
            <PanelHint>Memorize — it hides when the rail empties</PanelHint>
          </>
        )}

        {phase === 'type' && (
          <>
            <TypingSurface
              text={typed}
              typed={typed}
              caretIndex={typed.length}
              onKeyDown={onKeyDown}
              surfaceRef={focusRef}
              ariaLabel="Type the memorized phrase"
              center
              trailingAnchor
              className="min-h-[9rem] py-12"
            />
            <PanelHint>
              {typed.length === 0 ? (
                <>
                  Type what you remember · <Kbd>enter</Kbd> to submit
                </>
              ) : (
                <>
                  {typed.length} chars · target was ~
                  {phrase.split(/\s+/).length} words · <Kbd>enter</Kbd> to submit
                </>
              )}
            </PanelHint>
          </>
        )}

        {phase === 'round-result' && (
          <div className="px-8 pb-9 pt-1 text-center space-y-3">
            <p className="text-5xl font-bold font-mono tabular-nums">
              {lastRoundAcc}%
            </p>
            <p className="font-mono text-text/70 max-w-lg mx-auto">{phrase}</p>
            <p className="text-sm text-text/45">
              You typed:{' '}
              <span className="text-text/70 font-mono">{typed || '(empty)'}</span>
            </p>
          </div>
        )}
      </PlayTestPanel>
    </PlayShell>
  );
};
