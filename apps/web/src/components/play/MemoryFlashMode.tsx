import { PlayResultCard, PlayShell } from '@/components/play/PlayHud';
import {
  Kbd,
  PanelHint,
  PlayTestPanel,
} from '@/components/play/PlayTestPanel';
import { TypingSurface } from '@/components/test/TypingSurface';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts';
import { cn } from '@/lib/utils';
import { isNonPrintingKey } from '@/utils/typingEngine';
import { pickPhrase, savePlayBest } from '@/utils/playModes';
import { scoreRecall, type RecallScore } from '@/utils/recall';
import { submitPlayResult } from '@/utils/submitPlayResult';
import { playCompleteChime, playErrorBeep, playKeyClick } from '@/utils/testSounds';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

type Phase = 'ready' | 'flash' | 'type' | 'round-result' | 'over';

/**
 * The run is a memory-span ladder, not a fixed set of rounds: hold the phrase
 * and the next one is a word longer, drop it and it shrinks and costs a life.
 * Everyone converges on the longest phrase they can actually hold, and that
 * span — not an average percentage — is the score.
 */
const START_SPAN = 4;
const MIN_SPAN = 3;
const MAX_SPAN = 16;
const START_LIVES = 3;

/** Longer phrases get more time, but less time per word — that's the ramp. */
function flashDuration(span: number): number {
  return Math.min(5200, 1200 + span * 320);
}

function bankFor(span: number): 'easy' | 'medium' | 'hard' {
  return span >= 9 ? 'hard' : span >= 6 ? 'medium' : 'easy';
}

interface RoundRecord {
  span: number;
  hits: number;
  total: number;
  cleared: boolean;
}

export const MemoryFlashMode: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>('ready');
  const [span, setSpan] = useState(START_SPAN);
  const [nextSpan, setNextSpan] = useState(START_SPAN);
  const [bestSpan, setBestSpan] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [phrase, setPhrase] = useState('');
  const [typed, setTyped] = useState('');
  const [flashLeft, setFlashLeft] = useState(1);
  const [rounds, setRounds] = useState<RoundRecord[]>([]);
  const [lastScore, setLastScore] = useState<RecallScore | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [wordsRecalled, setWordsRecalled] = useState(0);
  const [finalWpm, setFinalWpm] = useState(0);
  const focusRef = useRef<HTMLDivElement>(null);
  /** Authoritative keystroke buffer: `typed` state lags a render behind when
      keys land faster than React commits, and appending to a stale copy
      silently swallows characters. */
  const buffer = useRef('');
  const flashTimer = useRef<number | null>(null);
  const flashDeadline = useRef(0);
  const typeStartedAt = useRef<number | null>(null);
  const typeMsTotal = useRef(0);
  const hitCharsTotal = useRef(0);
  const submitted = useRef(false);
  const allPhrases = useRef<string[]>([]);

  const clearFlashTimer = () => {
    if (flashTimer.current) {
      clearInterval(flashTimer.current);
      flashTimer.current = null;
    }
  };

  const startRound = useCallback((s: number) => {
    clearFlashTimer();
    setPhrase(pickPhrase(s, bankFor(s)));
    buffer.current = '';
    setTyped('');
    setPhase('flash');
    typeStartedAt.current = null;
    const dur = flashDuration(s);
    flashDeadline.current = Date.now() + dur;
    setFlashLeft(1);

    flashTimer.current = window.setInterval(() => {
      const left = Math.max(0, (flashDeadline.current - Date.now()) / dur);
      setFlashLeft(left);
      if (left <= 0) {
        clearFlashTimer();
        setPhase('type');
        typeStartedAt.current = Date.now();
      }
    }, 40);
  }, []);

  const reset = useCallback(() => {
    clearFlashTimer();
    setPhase('ready');
    setSpan(START_SPAN);
    setNextSpan(START_SPAN);
    setBestSpan(0);
    setLives(START_LIVES);
    setPhrase('');
    buffer.current = '';
    setTyped('');
    setRounds([]);
    setLastScore(null);
    setIsNewBest(false);
    setWordsRecalled(0);
    setFinalWpm(0);
    typeStartedAt.current = null;
    typeMsTotal.current = 0;
    hitCharsTotal.current = 0;
    submitted.current = false;
    allPhrases.current = [];
  }, []);

  useEffect(() => () => clearFlashTimer(), []);

  // The flash and type phases render separate surfaces, so the typing one only
  // exists after the commit that reveals it. Focusing here rather than from the
  // flash timer means a blind attempt can never be typed into nothing.
  useEffect(() => {
    if (phase === 'type') focusRef.current?.focus();
  }, [phase]);

  const finishRound = useCallback(
    async (finalTyped: string) => {
      const score = scoreRecall(phrase, finalTyped);
      setLastScore(score);
      allPhrases.current.push(phrase);
      hitCharsTotal.current += score.hitChars;
      typeMsTotal.current += typeStartedAt.current
        ? Date.now() - typeStartedAt.current
        : 0;

      const recalled = wordsRecalled + score.hits;
      setWordsRecalled(recalled);
      setRounds((r) => [
        ...r,
        { span, hits: score.hits, total: score.total, cleared: score.perfect },
      ]);

      const livesLeft = score.perfect ? lives : lives - 1;
      const climbedTo = score.perfect
        ? Math.min(MAX_SPAN, span + 1)
        : Math.max(MIN_SPAN, span - 1);
      const best = score.perfect ? Math.max(bestSpan, span) : bestSpan;
      setLives(livesLeft);
      setNextSpan(climbedTo);
      setBestSpan(best);

      if (score.perfect) playKeyClick();
      else playErrorBeep();

      if (livesLeft > 0) {
        setPhase('round-result');
        return;
      }

      setPhase('over');
      const wpm =
        typeMsTotal.current > 0
          ? Math.round(hitCharsTotal.current / 5 / (typeMsTotal.current / 60000))
          : 0;
      setFinalWpm(wpm);

      const runScore = best * 1000 + recalled;
      const label = best > 0 ? `${best}-word span` : 'no span held';
      setIsNewBest(savePlayBest('memory-flash', runScore, label));

      if (!submitted.current) {
        submitted.current = true;
        const targetWords = allPhrases.current.join(' ').split(/\s+/)
          .filter(Boolean).length;
        await submitPlayResult(
          {
            modeId: 'memory-flash',
            title: `Memory Flash · ${label}`,
            content: allPhrases.current.join(' · '),
            wpm,
            accuracy:
              targetWords > 0 ? Math.round((recalled / targetWords) * 100) : 0,
            errors: Math.max(0, targetWords - recalled),
            timeTaken: Math.max(1, Math.round(typeMsTotal.current / 1000)),
            wordCount: targetWords,
            score: runScore,
            scoreLabel: label,
          },
          !!user
        );
      }
      playCompleteChime();
    },
    [phrase, span, lives, bestSpan, wordsRecalled, user]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (phase !== 'type') return;
      if (isNonPrintingKey(e.key) && e.key !== 'Backspace' && e.key !== 'Enter') return;
      e.preventDefault();

      if (e.key === 'Enter') {
        void finishRound(buffer.current);
        return;
      }
      if (e.key === 'Backspace') {
        buffer.current = buffer.current.slice(0, -1);
        setTyped(buffer.current);
        return;
      }
      if (e.key.length !== 1) return;
      // Overshooting is scored as invented words, not a hard stop — but the
      // input still needs a ceiling.
      if (buffer.current.length > phrase.length + 24) return;

      const next = buffer.current + e.key;
      buffer.current = next;
      setTyped(next);
      // Landing the phrase exactly submits it — no reason to make someone
      // press enter to confirm what they already got right.
      if (next.trim().replace(/\s+/g, ' ') === phrase) {
        void finishRound(next);
      }
    },
    [phase, phrase, finishRound]
  );

  const exit = () => navigate({ to: '/play' });

  const typedWordCount = typed.trim() ? typed.trim().split(/\s+/).length : 0;

  if (phase === 'over') {
    return (
      <PlayShell modeId="memory-flash" title="Memory Flash" onExit={exit}>
        <PlayResultCard
          title={
            bestSpan > 0
              ? `${bestSpan}-word recall span`
              : 'No phrase held whole'
          }
          hint={
            bestSpan > 0
              ? `You held ${bestSpan} words at once and typed them back exactly.`
              : 'Every phrase came back with a word missing. The ladder starts at three next time.'
          }
          isNewBest={isNewBest}
          stats={[
            { label: 'Span', value: bestSpan > 0 ? bestSpan : '—' },
            { label: 'Words recalled', value: wordsRecalled },
            { label: 'Phrases', value: rounds.length },
            { label: 'Recall WPM', value: finalWpm },
          ]}
          onRetry={reset}
          onExit={exit}
        />
        <div className="text-center text-sm text-text/40 space-y-1 font-mono">
          {rounds.map((r, i) => (
            <p key={i}>
              <span className={r.cleared ? 'text-success' : 'text-destructive/70'}>
                {r.cleared ? '✓' : '✗'}
              </span>{' '}
              {r.span} words · {r.hits}/{r.total} recalled
            </p>
          ))}
        </div>
      </PlayShell>
    );
  }

  return (
    <PlayShell modeId="memory-flash"
      title="Memory Flash"
      subtitle="Hold the phrase, then type it back blind. It grows until you drop it."
      onExit={exit}
    >
      <PlayTestPanel
        stats={[
          { label: 'Span', value: `${span}`, accent: true },
          { label: 'Best', value: bestSpan > 0 ? bestSpan : '—' },
          {
            label: 'Lives',
            value: lives,
            tone: lives <= 1 ? 'danger' : 'default',
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
                setSpan(START_SPAN);
                startRound(START_SPAN);
              }}
            >
              Start session
            </Button>
          ) : phase === 'round-result' ? (
            <Button
              size="sm"
              onClick={() => {
                setSpan(nextSpan);
                startRound(nextSpan);
              }}
            >
              {lastScore?.perfect ? `Next · ${nextSpan} words` : 'Try again'}
            </Button>
          ) : undefined
        }
        onRestart={phase === 'ready' ? undefined : reset}
      >
        {phase === 'ready' && (
          <div className="px-8 pb-10 pt-1 text-center">
            <p className="text-text/60 max-w-md mx-auto leading-relaxed">
              A phrase flashes on screen, then vanishes. Type it back from
              memory. Get it exactly right and the next phrase is a word
              longer; miss and it shrinks and costs a life. Three lives — the
              longest phrase you hold is your span.
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
            {/* One slot per word in the hidden phrase — you always know how far
                you have left to reach, which is recall, not guesswork. */}
            <div
              className="flex items-center justify-center gap-1.5 px-8"
              aria-label={`${typedWordCount} of ${span} words typed`}
            >
              {Array.from({ length: span }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1 w-6 rounded-full transition-colors duration-150',
                    i < typedWordCount ? 'bg-accent' : 'bg-text/15'
                  )}
                />
              ))}
            </div>
            <PanelHint className="mt-0 pt-3">
              {typedWordCount} of {span} words · <Kbd>enter</Kbd> to submit
            </PanelHint>
          </>
        )}

        {phase === 'round-result' && lastScore && (
          <div className="px-8 pb-9 pt-1 text-center space-y-4">
            <p className="text-5xl font-bold font-mono tabular-nums">
              {lastScore.hits}
              <span className="text-text/35">/{lastScore.total}</span>
            </p>
            {/* The phrase and the attempt merged into one line: what you held,
                what slipped, what you invented. */}
            <p className="font-mono text-lg max-w-xl mx-auto text-balance">
              {lastScore.diff.map((w, i) => (
                <span
                  key={i}
                  className={cn(
                    w.mark === 'hit' && 'text-text',
                    w.mark === 'missed' && 'text-text/35 line-through',
                    w.mark === 'extra' && 'text-destructive/75'
                  )}
                >
                  {w.word}{' '}
                </span>
              ))}
            </p>
            <p
              className={cn(
                'text-sm',
                lastScore.perfect ? 'text-success' : 'text-text/45'
              )}
            >
              {lastScore.perfect
                ? `Held it — ${span} words up to ${nextSpan}`
                : `Life lost — ${span} words down to ${nextSpan}, ${lives} left`}
            </p>
          </div>
        )}
      </PlayTestPanel>
    </PlayShell>
  );
};
