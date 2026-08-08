import { useNavigate } from '@tanstack/react-router';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PlayResultCard, PlayShell } from '@/components/play/PlayHud';
import { Kbd, PanelHint, PlayTestPanel } from '@/components/play/PlayTestPanel';
import { TypingSurface } from '@/components/test/TypingSurface';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { useAuth } from '@/contexts';
import { useArmedHotkey } from '@/hooks/useArmedHotkey';
import { cn } from '@/lib/utils';
import { loadPlayBests, type PlayBests, pickPhrase, savePlayBest } from '@/utils/playModes';
import { type RecallScore, scoreRecall } from '@/utils/recall';
import { submitPlayResult } from '@/utils/submitPlayResult';
import { playCompleteChime, playErrorBeep, playKeyClick } from '@/utils/testSounds';
import { isNonPrintingKey } from '@/utils/typingEngine';

type Phase = 'ready' | 'flash' | 'type' | 'round-result' | 'over';

/**
 * The run is a memory-span ladder, not a fixed set of rounds: hold the phrase
 * and the next one is a word longer, drop it and it shrinks and costs a life.
 * Everyone converges on the longest phrase they can actually hold, and that
 * span - not an average percentage - is the score.
 */
const START_SPAN = 4;
const MIN_SPAN = 3;
const MAX_SPAN = 16;
const START_LIVES = 3;

/** Longer phrases get more time, but less time per word - that's the ramp. */
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

const STEPS = [
  'A phrase appears. Read it while the rail drains.',
  'The phrase hides itself - nothing left to look at.',
  'Type it back from memory and press enter.',
];

const RULES: { term: string; detail: string }[] = [
  { term: 'exact', detail: 'The next phrase comes back a word longer.' },
  {
    term: 'missed',
    detail: 'It shrinks by a word and costs one of your three lives.',
  },
  {
    term: 'score',
    detail: 'The longest phrase you typed back whole - your span.',
  },
];

/** Enter or space moves the run forward from any of its waiting screens. */
const ADVANCE_KEYS = ['Enter', ' '];

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
      typeMsTotal.current += typeStartedAt.current ? Date.now() - typeStartedAt.current : 0;

      const recalled = wordsRecalled + score.hits;
      setWordsRecalled(recalled);
      setRounds((r) => [
        ...r,
        { span, hits: score.hits, total: score.total, cleared: score.perfect },
      ]);

      const livesLeft = score.perfect ? lives : lives - 1;
      const climbedTo = score.perfect ? Math.min(MAX_SPAN, span + 1) : Math.max(MIN_SPAN, span - 1);
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
        const targetWords = allPhrases.current.join(' ').split(/\s+/).filter(Boolean).length;
        await submitPlayResult(
          {
            modeId: 'memory-flash',
            title: `Memory Flash · ${label}`,
            content: allPhrases.current.join(' · '),
            wpm,
            accuracy: targetWords > 0 ? Math.round((recalled / targetWords) * 100) : 0,
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
      // Overshooting is scored as invented words, not a hard stop - but the
      // input still needs a ceiling.
      if (buffer.current.length > phrase.length + 24) return;

      const next = buffer.current + e.key;
      buffer.current = next;
      setTyped(next);
      // Landing the phrase exactly submits it - no reason to make someone
      // press enter to confirm what they already got right.
      if (next.trim().replace(/\s+/g, ' ') === phrase) {
        void finishRound(next);
      }
    },
    [phase, phrase, finishRound]
  );

  const exit = () => navigate({ to: '/play' });

  const startSession = useCallback(() => {
    setSpan(START_SPAN);
    startRound(START_SPAN);
  }, [startRound]);

  const goNext = useCallback(() => {
    setSpan(nextSpan);
    startRound(nextSpan);
  }, [nextSpan, startRound]);

  // Both waiting screens advance on the keyboard, so a whole run can be played
  // without reaching for the mouse.
  useArmedHotkey(ADVANCE_KEYS, startSession, { enabled: phase === 'ready' });
  useArmedHotkey(ADVANCE_KEYS, goNext, { enabled: phase === 'round-result' });

  const typedWordCount = typed.trim() ? typed.trim().split(/\s+/).length : 0;

  // Re-read on every return to the landing screen so a run just finished shows
  // up as the best without a reload.
  const [storedBest, setStoredBest] = useState<PlayBests['memory-flash']>();
  useEffect(() => {
    if (phase === 'ready') setStoredBest(loadPlayBests()['memory-flash']);
  }, [phase]);

  if (phase === 'over') {
    return (
      <PlayShell modeId="memory-flash" title="Memory Flash" onExit={exit}>
        <PlayResultCard
          title={bestSpan > 0 ? `${bestSpan}-word recall span` : 'No phrase held whole'}
          hint={
            bestSpan > 0
              ? `You held ${bestSpan} words at once and typed them back exactly.`
              : 'Every phrase came back with a word missing. The ladder starts at three next time.'
          }
          isNewBest={isNewBest}
          stats={[
            { label: 'Span', value: bestSpan > 0 ? bestSpan : '-' },
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

  // The landing screen explains the mode; it deliberately doesn't wear the
  // typing slab, so nothing here reads as a test already in progress.
  if (phase === 'ready') {
    return (
      <PlayShell
        modeId="memory-flash"
        title="Memory Flash"
        subtitle="Hold the phrase, then type it back blind. It grows until you drop it."
        onExit={exit}
      >
        <Panel>
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="text-[10px] uppercase tracking-[0.16em] text-text/40 font-medium mb-4">
                How a round works
              </h2>
              <ol className="space-y-3.5">
                {STEPS.map((step, i) => (
                  <li key={step} className="flex gap-3 items-start">
                    <span className="size-6 rounded-full bg-accent/20 text-accent font-mono text-xs flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-sm text-text/60 leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className="sm:border-l sm:border-accent/10 sm:pl-8">
              <h2 className="text-[10px] uppercase tracking-[0.16em] text-text/40 font-medium mb-4">
                The ladder
              </h2>
              <dl className="space-y-3.5">
                {RULES.map((rule) => (
                  <div key={rule.term} className="flex gap-3 items-baseline">
                    <dt className="font-mono text-xs text-accent w-14 shrink-0">{rule.term}</dt>
                    <dd className="text-sm text-text/60 leading-relaxed">{rule.detail}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Panel>

        <Panel tone="accent" bodyClassName="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium tracking-tight">Ready when you are</p>
            <p className="text-xs text-text/45 mt-0.5 font-mono">
              Starts at {START_SPAN} words
              {storedBest ? ` · best ${storedBest.label}` : ''}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Button size="lg" onClick={startSession} className="min-w-[11rem]">
              Start session
            </Button>
            <p className="text-[11px] font-mono text-text/45">
              press <Kbd>enter</Kbd>
            </p>
          </div>
        </Panel>
      </PlayShell>
    );
  }

  return (
    <PlayShell
      modeId="memory-flash"
      title="Memory Flash"
      subtitle="Hold the phrase, then type it back blind. It grows until you drop it."
      onExit={exit}
    >
      <PlayTestPanel
        stats={[
          { label: 'Span', value: `${span}`, accent: true },
          { label: 'Best', value: bestSpan > 0 ? bestSpan : '-' },
          {
            label: 'Lives',
            value: lives,
            tone: lives <= 1 ? 'danger' : 'default',
          },
          {
            label: 'Phase',
            value: phase === 'flash' ? 'Memorize' : phase === 'type' ? 'Type' : 'Result',
          },
        ]}
        meter={phase === 'flash' ? flashLeft : null}
        meterActive={phase === 'flash'}
        actions={
          phase === 'round-result' ? (
            <Button size="sm" onClick={goNext}>
              {lastScore?.perfect ? `Next · ${nextSpan} words` : 'Try again'}
            </Button>
          ) : undefined
        }
        onRestart={reset}
      >
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
            <PanelHint>Memorize - it hides when the rail empties</PanelHint>
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
            {/* One slot per word in the hidden phrase - you always know how far
                you have left to reach, which is recall, not guesswork. */}
            <div
              className="flex items-center justify-center gap-1.5 px-8"
              role="img"
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
            <p className={cn('text-sm', lastScore.perfect ? 'text-success' : 'text-text/45')}>
              {lastScore.perfect
                ? `Held it - ${span} words up to ${nextSpan}`
                : `Life lost - ${span} words down to ${nextSpan}, ${lives} left`}
            </p>
            <p className="text-[11px] font-mono text-text/40">
              press <Kbd>enter</Kbd> to keep going
            </p>
          </div>
        )}
      </PlayTestPanel>
    </PlayShell>
  );
};
