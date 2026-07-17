import {
  PlayHud,
  PlayResultCard,
  PlayShell,
  PlayStat,
  TypedChars,
} from '@/components/play/PlayHud';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts';
import { generateKeyDrill, TOP_1000_WORDS, uniqueWords } from '@tactile/content';
import { isNonPrintingKey } from '@/utils/typingEngine';
import { getWeakKeyChars, getWeakKeys, recordKeyAttempt } from '@/utils/weakKeys';
import { pickWord, savePlayBest } from '@/utils/playModes';
import { submitPlayResult } from '@/utils/submitPlayResult';
import { playCompleteChime, playErrorBeep, playKeyClick } from '@/utils/testSounds';
import { useNavigate } from '@tanstack/react-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Adaptive Word Storm: every word is biased toward YOUR weak keys.
 * Falls back to common hard letters if no history yet.
 */

type Phase = 'ready' | 'running' | 'over';

const BASE_MS = 3800;
const MIN_MS = 1400;
const LEVEL_EVERY = 4;
const START_LIVES = 3;
const DEFAULT_WEAK = ['e', 'r', 'i', 'o', 'n', 'a'];

function timeLimitMs(level: number): number {
  return Math.max(MIN_MS, BASE_MS - (level - 1) * 260);
}

function wpmFrom(chars: number, ms: number): number {
  const mins = ms / 60000;
  if (mins <= 0) return 0;
  return Math.round(chars / 5 / mins);
}

function pickWeakWord(keys: string[], level: number): string {
  if (keys.length === 0) return pickWord(level >= 5 ? 'hard' : 'medium');

  // Mix: key-drill word or hard word containing key
  if (Math.random() < 0.55) {
    const drill = generateKeyDrill(keys, 8);
    const words = drill.content.split(/\s+/).filter(Boolean);
    if (words.length) return words[Math.floor(Math.random() * words.length)]!;
  }

  const bank = uniqueWords(TOP_1000_WORDS);
  const lower = keys.map((k) => k.toLowerCase());
  const matches = bank.filter((w) => lower.some((k) => w.includes(k)));
  if (matches.length) {
    return matches[Math.floor(Math.random() * matches.length)]!;
  }

  // Fabricate short word heavy on weak keys
  const fillers = 'aeiou';
  let out = '';
  for (let i = 0; i < 4 + (level > 4 ? 1 : 0); i++) {
    out +=
      Math.random() < 0.65
        ? lower[Math.floor(Math.random() * lower.length)]!
        : fillers[Math.floor(Math.random() * fillers.length)]!;
  }
  return out;
}

export const WeakStormMode: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const weakKeys = useMemo(() => {
    const k = getWeakKeyChars(8);
    return k.length >= 2 ? k : DEFAULT_WEAK;
  }, []);
  const weakStats = useMemo(() => getWeakKeys(6), []);

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
  const wordDeadline = useRef(0);
  const focusRef = useRef<HTMLDivElement>(null);
  const submitted = useRef(false);
  const history = useRef<string[]>([]);

  const nextWord = useCallback(
    (lvl: number) => {
      const w = pickWeakWord(weakKeys, lvl);
      setWord(w);
      setTyped('');
      wordDeadline.current = Date.now() + timeLimitMs(lvl);
      setTimeLeft(1);
    },
    [weakKeys]
  );

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
    history.current = [];
    nextWord(1);
    requestAnimationFrame(() => focusRef.current?.focus());
  }, [nextWord]);

  useEffect(() => {
    reset();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const endRun = useCallback(
    async (finalCleared: number, finalCombo: number, finalCorrect: number, finalErrors: number) => {
      setPhase('over');
      const end = Date.now();
      const elapsed = startMs.current ? end - startMs.current : 1;
      const wpm = wpmFrom(finalCorrect, elapsed);
      setFinalWpm(wpm);
      playErrorBeep();

      const score = finalCleared * 120 + finalCombo * 15 + wpm;
      const isBest = savePlayBest(
        'weak-storm',
        score,
        `${finalCleared} weak words · L${Math.max(1, Math.ceil(finalCleared / LEVEL_EVERY))}`
      );
      setIsNewBest(isBest);

      if (!submitted.current) {
        submitted.current = true;
        await submitPlayResult(
          {
            modeId: 'weak-storm',
            title: `Weak Storm · ${finalCleared} cleared`,
            content: history.current.join(' ') || word,
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
      if (expected) recordKeyAttempt(expected, e.key === expected);

      if (e.key !== expected) {
        setErrors((er) => er + 1);
        setCombo(0);
        playErrorBeep();
        setTyped('');
        return;
      }

      playKeyClick();
      const next = typed + e.key;
      setTyped(next);
      setCorrectChars((c) => c + 1);

      if (next.length === word.length) {
        history.current.push(word);
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
      <PlayShell modeId="weak-storm" title="Weak Storm" onExit={exit}>
        <PlayResultCard
          title={cleared === 0 ? 'Storm won' : `${cleared} weak words cleared`}
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
    <PlayShell modeId="weak-storm"
      title="Weak Storm"
      subtitle="Word Storm, but every word targets your weak keys."
      onExit={exit}
    >
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="text-text/40 uppercase tracking-wider">Targeting</span>
        {weakKeys.map((k) => (
          <span
            key={k}
            className="font-mono px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/20"
          >
            {k === ' ' ? '␣' : k}
          </span>
        ))}
        {weakStats.length === 0 && (
          <span className="text-text/35">(defaults — play more to personalize)</span>
        )}
      </div>

      <PlayHud>
        <PlayStat label="Cleared" value={cleared} accent />
        <PlayStat label="Level" value={level} />
        <PlayStat label="Combo" value={combo} />
        <PlayStat label="Lives" value={lives} />
      </PlayHud>

      <div className="h-1.5 rounded-full bg-accent/12 overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-75 ease-linear ${
            timeLeft < 0.25 && phase === 'running' ? 'bg-rose-400' : 'bg-rose-400/75'
          }`}
          style={{
            width: `${Math.round(timeLeft * 100)}%`,
            opacity: phase === 'running' ? 1 : 0.35,
          }}
        />
      </div>

      <div
        ref={focusRef}
        tabIndex={0}
        role="textbox"
        aria-label="Weak storm typing area"
        onKeyDown={onKeyDown}
        onClick={() => focusRef.current?.focus()}
        className="outline-none rounded-2xl border border-rose-500/20 bg-primary/35 p-10 sm:p-14 min-h-[220px] flex flex-col items-center justify-center cursor-text transition-[border-color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:border-rose-400/45 focus-visible:shadow-[0_0_0_3px_rgba(244,63,94,0.08)]"
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-text/35 mb-4">
          {phase === 'ready' ? 'Type to start adaptive storm' : 'Hit the weak keys'}
        </p>
        <div className="text-center scale-110 sm:scale-125">
          <TypedChars text={word} typed={typed} showCursor />
        </div>
      </div>

      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={reset}>
          Restart
        </Button>
      </div>
    </PlayShell>
  );
};
