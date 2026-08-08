import { useNavigate } from '@tanstack/react-router';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PlayResultCard, PlayShell } from '@/components/play/PlayHud';
import { Kbd, PanelHint, PlayTestPanel } from '@/components/play/PlayTestPanel';
import { TypingSurface } from '@/components/test/TypingSurface';
import { useAuth } from '@/contexts';
import { pickWord, savePlayBest } from '@/utils/playModes';
import { submitPlayResult } from '@/utils/submitPlayResult';
import { playCompleteChime, playErrorBeep, playKeyClick } from '@/utils/testSounds';
import { isNonPrintingKey } from '@/utils/typingEngine';

type Phase = 'ready' | 'running' | 'over';

/** Base ms allowed per word; shrinks each level. */
const BASE_MS = 3500;
const MIN_MS = 1200;
const LEVEL_EVERY = 5;
const START_LIVES = 3;

function timeLimitMs(level: number): number {
  return Math.max(MIN_MS, BASE_MS - (level - 1) * 280);
}

function wpmFrom(chars: number, ms: number): number {
  const mins = ms / 60000;
  if (mins <= 0) return 0;
  return Math.round(chars / 5 / mins);
}

export const WordStormMode: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>('ready');
  const [word, setWord] = useState('');
  const [typed, setTyped] = useState('');
  const [level, setLevel] = useState(1);
  const [cleared, setCleared] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(1);
  const [correctChars, setCorrectChars] = useState(0);
  const [errors, setErrors] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalWpm, setFinalWpm] = useState(0);
  const startMs = useRef<number | null>(null);
  const wordDeadline = useRef<number>(0);
  const focusRef = useRef<HTMLDivElement>(null);
  const submitted = useRef(false);
  const wordHistory = useRef<string[]>([]);

  const nextWord = useCallback((lvl: number) => {
    const difficulty = lvl >= 6 ? 'hard' : lvl >= 3 ? 'medium' : 'easy';
    const w = pickWord(difficulty);
    setWord(w);
    setTyped('');
    const limit = timeLimitMs(lvl);
    wordDeadline.current = Date.now() + limit;
    setTimeLeft(1);
  }, []);

  const reset = useCallback(() => {
    setPhase('ready');
    setLevel(1);
    setCleared(0);
    setLives(START_LIVES);
    setCombo(0);
    setBestCombo(0);
    setCorrectChars(0);
    setErrors(0);
    setIsNewBest(false);
    setFinalWpm(0);
    startMs.current = null;
    submitted.current = false;
    wordHistory.current = [];
    nextWord(1);
    requestAnimationFrame(() => focusRef.current?.focus());
  }, [nextWord]);

  useEffect(() => {
    reset();
  }, []);

  const endRun = useCallback(
    async (finalCleared: number, finalCombo: number, finalCorrect: number, finalErrors: number) => {
      setPhase('over');
      const end = Date.now();
      const elapsed = startMs.current ? end - startMs.current : 1;
      const wpm = wpmFrom(finalCorrect, elapsed);
      setFinalWpm(wpm);
      playErrorBeep();

      const score = finalCleared * 100 + finalCombo * 10 + wpm;
      const isBest = savePlayBest(
        'word-storm',
        score,
        `${finalCleared} words · L${Math.max(1, Math.ceil(finalCleared / LEVEL_EVERY))}`
      );
      setIsNewBest(isBest);

      if (!submitted.current) {
        submitted.current = true;
        await submitPlayResult(
          {
            modeId: 'word-storm',
            title: `Word Storm · ${finalCleared} cleared`,
            content: wordHistory.current.join(' ') || word,
            wpm,
            accuracy:
              finalCorrect + finalErrors > 0
                ? Math.round((finalCorrect / (finalCorrect + finalErrors)) * 100)
                : 100,
            errors: finalErrors,
            timeTaken: Math.max(1, Math.round(elapsed / 1000)),
            wordCount: Math.max(1, finalCleared),
            score,
            scoreLabel: `${finalCleared} words`,
          },
          !!user
        );
      }
      playCompleteChime();
    },
    [word, user]
  );

  // Countdown bar + timeout
  useEffect(() => {
    if (phase !== 'running') return;
    const id = window.setInterval(() => {
      const now = Date.now();
      const limit = timeLimitMs(level);
      const left = Math.max(0, (wordDeadline.current - now) / limit);
      setTimeLeft(left);
      if (left <= 0) {
        const remaining = lives - 1;
        setLives(remaining);
        setCombo(0);
        setErrors((e) => e + 1);
        if (remaining <= 0) {
          void endRun(cleared, bestCombo, correctChars, errors + 1);
        } else {
          playErrorBeep();
          nextWord(level);
        }
      }
    }, 50);
    return () => clearInterval(id);
  }, [phase, level, lives, cleared, bestCombo, correctChars, errors, endRun, nextWord]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (phase === 'over') return;
      if (isNonPrintingKey(e.key) && e.key !== 'Backspace') return;
      e.preventDefault();

      if (phase === 'ready' && e.key.length === 1) {
        setPhase('running');
        startMs.current = Date.now();
        wordDeadline.current = Date.now() + timeLimitMs(level);
      }

      if (e.key === 'Backspace') {
        setTyped((t) => t.slice(0, -1));
        return;
      }
      if (e.key.length !== 1) return;

      const expected = word[typed.length];
      if (e.key !== expected) {
        setErrors((er) => er + 1);
        setCombo(0);
        playErrorBeep();
        // Wrong key: reset current word input but keep timer pressure
        setTyped('');
        return;
      }

      playKeyClick();
      const next = typed + e.key;
      setTyped(next);
      setCorrectChars((c) => c + 1);

      if (next.length === word.length) {
        wordHistory.current.push(word);
        const newCleared = cleared + 1;
        const newCombo = combo + 1;
        setCleared(newCleared);
        setCombo(newCombo);
        setBestCombo((b) => Math.max(b, newCombo));
        const newLevel = Math.floor(newCleared / LEVEL_EVERY) + 1;
        setLevel(newLevel);
        nextWord(newLevel);
      }
    },
    [phase, word, typed, level, cleared, combo, nextWord]
  );

  const exit = () => navigate({ to: '/play' });

  if (phase === 'over') {
    return (
      <PlayShell modeId="word-storm" title="Word Storm" onExit={exit}>
        <PlayResultCard
          title={cleared === 0 ? 'Storm wiped you out' : `${cleared} words cleared`}
          isNewBest={isNewBest}
          stats={[
            { label: 'Cleared', value: cleared },
            { label: 'Level', value: level },
            { label: 'Best combo', value: bestCombo },
            { label: 'WPM', value: finalWpm },
          ]}
          onRetry={reset}
          onExit={exit}
        />
      </PlayShell>
    );
  }

  return (
    <PlayShell
      modeId="word-storm"
      title="Word Storm"
      subtitle="One word at a time. Timer shrinks as you level up."
      onExit={exit}
    >
      <PlayTestPanel
        stats={[
          { label: 'Cleared', value: cleared, accent: true },
          { label: 'Level', value: level },
          { label: 'Combo', value: combo },
          {
            label: 'Lives',
            value: lives,
            tone: lives <= 1 ? 'danger' : 'default',
          },
          {
            label: 'Left',
            value:
              phase === 'running' ? `${Math.ceil((timeLeft * timeLimitMs(level)) / 1000)}s` : '-',
            tone: timeLeft < 0.25 && phase === 'running' ? 'danger' : 'default',
          },
        ]}
        meter={timeLeft}
        meterTone={timeLeft < 0.25 && phase === 'running' ? 'danger' : 'accent'}
        meterActive={phase === 'running'}
        onRestart={reset}
      >
        <TypingSurface
          text={word}
          typed={typed}
          caretIndex={typed.length}
          onKeyDown={onKeyDown}
          surfaceRef={focusRef}
          ariaLabel="Word storm typing area"
          center
          trailingAnchor
          className="min-h-[9rem] py-12"
        />
        {phase === 'ready' && (
          <PanelHint>
            <Kbd>type</Kbd> the word before the rail empties
          </PanelHint>
        )}
      </PlayTestPanel>
    </PlayShell>
  );
};
