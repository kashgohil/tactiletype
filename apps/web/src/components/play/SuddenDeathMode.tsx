import { useNavigate } from '@tanstack/react-router';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PlayResultCard, PlayShell } from '@/components/play/PlayHud';
import { Kbd, PanelHint, PlayTestPanel } from '@/components/play/PlayTestPanel';
import { type CharStatus, TypingSurface } from '@/components/test/TypingSurface';
import { useAuth } from '@/contexts';
import { cn } from '@/lib/utils';
import { isActiveDailyForMode } from '@/utils/dailyRun';
import { pickWords, savePlayBest } from '@/utils/playModes';
import { submitPlayResult } from '@/utils/submitPlayResult';
import { playCompleteChime, playErrorBeep } from '@/utils/testSounds';
import { isNonPrintingKey } from '@/utils/typingEngine';
import { recordKeyAttempt } from '@/utils/weakKeys';

type Phase = 'ready' | 'running' | 'dead';

const STREAM_SIZE = 80;
const REFILL_AT = 30;
/** Words per rendered window - the passage only re-flows on this boundary. */
const WINDOW = 12;

function wpmFrom(correctChars: number, startMs: number | null, endMs: number): number {
  if (!startMs) return 0;
  const mins = (endMs - startMs) / 60000;
  if (mins <= 0) return 0;
  return Math.round(correctChars / 5 / mins);
}

export const SuddenDeathMode: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDaily = useMemo(() => isActiveDailyForMode('sudden-death'), []);
  const [livesMode, setLivesMode] = useState<1 | 3>(1);
  const [lives, setLives] = useState(1);
  const [phase, setPhase] = useState<Phase>('ready');
  const [words, setWords] = useState<string[]>([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [wordsCleared, setWordsCleared] = useState(0);
  const [correctChars, setCorrectChars] = useState(0);
  const [errors, setErrors] = useState(0);
  const [liveWpm, setLiveWpm] = useState(0);
  const [peakWpm, setPeakWpm] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const startMs = useRef<number | null>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const submitted = useRef(false);

  const currentWord = words[wordIndex] ?? '';

  const reset = useCallback(
    (livesCount: 1 | 3 = livesMode) => {
      setWords(pickWords(STREAM_SIZE, 'medium'));
      setWordIndex(0);
      setTyped('');
      setWordsCleared(0);
      setCorrectChars(0);
      setErrors(0);
      setLiveWpm(0);
      setPeakWpm(0);
      setLives(livesCount);
      setPhase('ready');
      setIsNewBest(false);
      startMs.current = null;
      submitted.current = false;
      requestAnimationFrame(() => focusRef.current?.focus());
    },
    [livesMode]
  );

  useEffect(() => {
    // Daily mode is always hardcore (1 life)
    if (isDaily) {
      setLivesMode(1);
      reset(1);
    } else {
      reset(livesMode);
    }
  }, []);

  // Live WPM tick
  useEffect(() => {
    if (phase !== 'running' || !startMs.current) return;
    const id = window.setInterval(() => {
      const w = wpmFrom(correctChars, startMs.current, Date.now());
      setLiveWpm(w);
      setPeakWpm((p) => Math.max(p, w));
    }, 200);
    return () => clearInterval(id);
  }, [phase, correctChars]);

  const die = useCallback(
    async (finalCorrect: number, finalWords: number, finalErrors: number) => {
      setPhase('dead');
      const end = Date.now();
      const wpm = wpmFrom(finalCorrect, startMs.current, end);
      const peak = Math.max(peakWpm, wpm);
      setPeakWpm(peak);
      setLiveWpm(wpm);
      playErrorBeep();

      const score = finalWords * 10 + peak;
      const isBest = savePlayBest('sudden-death', score, `${finalWords} words · ${peak} peak WPM`);
      setIsNewBest(isBest);

      if (!submitted.current) {
        submitted.current = true;
        const content = words.slice(0, Math.max(finalWords, 1)).join(' ');
        const elapsed = startMs.current ? Math.round((end - startMs.current) / 1000) : 1;
        await submitPlayResult(
          {
            modeId: 'sudden-death',
            title: `Sudden Death · ${finalWords} words`,
            content: content || currentWord,
            wpm,
            accuracy:
              finalCorrect + finalErrors > 0
                ? Math.round((finalCorrect / (finalCorrect + finalErrors)) * 100)
                : 100,
            errors: finalErrors,
            timeTaken: Math.max(1, elapsed),
            wordCount: Math.max(1, finalWords),
            score,
            scoreLabel: `${finalWords} words`,
          },
          !!user
        );
      }
      playCompleteChime();
    },
    [peakWpm, words, currentWord, user]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (phase === 'dead') return;
      if (isNonPrintingKey(e.key) && e.key !== 'Backspace') return;
      e.preventDefault();

      if (phase === 'ready' && e.key.length === 1) {
        setPhase('running');
        startMs.current = Date.now();
      }

      if (e.key === 'Backspace') {
        setTyped((t) => t.slice(0, -1));
        return;
      }

      if (e.key.length !== 1) return;

      const expected = currentWord;
      // The stream renders a space between words and the caret parks on it, so
      // the space is a key you press - advancing for you meant the space the
      // player could plainly see was the one keystroke that ended the run.
      const expectedChar = typed.length === expected.length ? ' ' : expected[typed.length]!;
      recordKeyAttempt(expectedChar, e.key === expectedChar);

      // Wrong character → lose a life / die
      if (e.key !== expectedChar) {
        const newErrors = errors + 1;
        setErrors(newErrors);
        const remaining = lives - 1;
        setLives(remaining);
        if (remaining <= 0) {
          void die(correctChars, wordsCleared, newErrors);
        } else {
          playErrorBeep();
          setTyped('');
        }
        return;
      }

      setCorrectChars((c) => c + 1);

      // The closing space clears the word and moves the caret to the next one.
      if (expectedChar === ' ') {
        setWordsCleared(wordsCleared + 1);
        setTyped('');
        const nextIndex = wordIndex + 1;
        if (nextIndex >= words.length - REFILL_AT) {
          setWords([...words, ...pickWords(STREAM_SIZE, 'medium')]);
        }
        setWordIndex(nextIndex);
        return;
      }

      setTyped(typed + e.key);
    },
    [phase, typed, currentWord, lives, errors, correctChars, wordsCleared, wordIndex, words, die]
  );

  const exit = () => navigate({ to: '/play' });

  if (phase === 'dead') {
    return (
      <PlayShell modeId="sudden-death" title="Sudden Death" onExit={exit}>
        <PlayResultCard
          title={wordsCleared === 0 ? 'Instant KO' : `${wordsCleared} words survived`}
          isNewBest={isNewBest}
          stats={[
            { label: 'Words', value: wordsCleared },
            { label: 'Peak WPM', value: peakWpm },
            { label: 'Errors', value: errors },
          ]}
          onRetry={() => reset()}
          onExit={exit}
        />
      </PlayShell>
    );
  }

  // Render a window of the stream instead of just the current word, so the
  // caret travels through a passage like the main test. The window only
  // advances every WINDOW words, so the text doesn't re-flow on every clear.
  const windowStart = Math.floor(wordIndex / WINDOW) * WINDOW;
  const stream = words.slice(windowStart, windowStart + WINDOW * 3).join(' ');
  const offset =
    words.slice(windowStart, wordIndex).join(' ').length + (wordIndex > windowStart ? 1 : 0);

  const charStatus = (i: number): CharStatus => {
    if (i < offset) return 'correct';
    const local = i - offset;
    if (local < typed.length) {
      return typed[local] === stream[i] ? 'correct' : 'incorrect';
    }
    return local === typed.length ? 'current' : 'pending';
  };

  return (
    <PlayShell
      modeId="sudden-death"
      title="Sudden Death"
      subtitle="One wrong key ends the run. Type clean - survive."
      onExit={exit}
    >
      {phase === 'ready' && !isDaily && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-text/40 uppercase tracking-wider mr-1">Difficulty</span>
          {([1, 3] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setLivesMode(n);
                reset(n);
              }}
              className={cn(
                'text-sm px-3 py-1 rounded-full border transition-colors',
                livesMode === n
                  ? 'border-accent bg-accent/20 text-text'
                  : 'border-accent/15 text-text/50 hover:border-accent/30'
              )}
            >
              {n === 1 ? 'Hardcore (1 life)' : '3 lives'}
            </button>
          ))}
        </div>
      )}
      {isDaily && phase === 'ready' && (
        <p className="text-center text-xs text-destructive/80 font-mono">
          Daily mode · hardcore only (1 life)
        </p>
      )}

      <PlayTestPanel
        stats={[
          { label: 'Words', value: wordsCleared, accent: true },
          { label: 'WPM', value: phase === 'running' ? liveWpm : '-' },
          {
            label: 'Lives',
            value: lives,
            tone: lives <= 1 ? 'danger' : 'default',
          },
          { label: 'Mode', value: livesMode === 1 ? 'Hardcore' : '3 lives' },
        ]}
        onRestart={() => reset()}
      >
        <TypingSurface
          text={stream}
          getStatus={charStatus}
          caretIndex={offset + typed.length}
          onKeyDown={onKeyDown}
          surfaceRef={focusRef}
          ariaLabel="Sudden death typing area"
        />
        {phase === 'ready' && (
          <PanelHint>
            <Kbd>type</Kbd> to start - the first mistake ends the run
          </PanelHint>
        )}
      </PlayTestPanel>
    </PlayShell>
  );
};
