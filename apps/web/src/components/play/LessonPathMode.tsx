import { useNavigate } from '@tanstack/react-router';
import { Check, Lock } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PlayResultCard, PlayShell } from '@/components/play/PlayHud';
import { Kbd, PanelHint, PlayTestPanel } from '@/components/play/PlayTestPanel';
import { type CharStatus, TypingSurface } from '@/components/test/TypingSurface';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts';
import { cn } from '@/lib/utils';
import { challengesApi } from '@/services/challengesApi';
import {
  CURRICULUM,
  type CurriculumProgress,
  curriculumCompletionPercent,
  isLessonComplete,
  isLessonUnlocked,
  type LessonDef,
  loadCurriculumProgress,
  markLessonPassed,
  pullCurriculumFromServer,
} from '@/utils/curriculum';
import { submitPlayResult } from '@/utils/submitPlayResult';
import { playCompleteChime, playErrorBeep, playKeyClick } from '@/utils/testSounds';
import { isNonPrintingKey } from '@/utils/typingEngine';
import { recordKeyAttempt } from '@/utils/weakKeys';

type Phase = 'map' | 'ready' | 'running' | 'passed' | 'failed';

function wpmFrom(correct: number, startMs: number | null, endMs: number): number {
  if (!startMs) return 0;
  const mins = (endMs - startMs) / 60000;
  if (mins <= 0) return 0;
  return Math.round(correct / 5 / mins);
}

function accuracyOf(correct: number, incorrect: number): number {
  const t = correct + incorrect;
  return t > 0 ? Math.round((correct / t) * 100) : 100;
}

export const LessonPathMode: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [progress, setProgress] = useState<CurriculumProgress>(() => loadCurriculumProgress());
  const [phase, setPhase] = useState<Phase>('map');
  const [lesson, setLesson] = useState<LessonDef | null>(null);
  const [text, setText] = useState('');
  const [typed, setTyped] = useState('');
  const [errors, setErrors] = useState<Set<number>>(new Set());
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [failReason, setFailReason] = useState('');
  const [liveWpm, setLiveWpm] = useState(0);
  const [finalStats, setFinalStats] = useState({ wpm: 0, accuracy: 100, correct: 0, incorrect: 0 });
  const startMs = useRef<number | null>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const submitted = useRef(false);

  const exit = () => navigate({ to: '/play' });

  // Merge server curriculum progress when logged in
  useEffect(() => {
    if (!user) return;
    void pullCurriculumFromServer(async () => {
      try {
        return await challengesApi.getCurriculum();
      } catch {
        return null;
      }
    }).then((merged) => setProgress(merged));
  }, [user]);

  const openLesson = (l: LessonDef) => {
    if (!isLessonUnlocked(l, progress)) return;
    setLesson(l);
    setText(l.generate());
    setTyped('');
    setErrors(new Set());
    setStreak(0);
    setBestStreak(0);
    setFailReason('');
    setLiveWpm(0);
    setFinalStats({ wpm: 0, accuracy: 100, correct: 0, incorrect: 0 });
    startMs.current = null;
    submitted.current = false;
    setPhase('ready');
    requestAnimationFrame(() => focusRef.current?.focus());
  };

  const correctCount = typed.length - errors.size;
  const incorrectCount = errors.size;

  useEffect(() => {
    if (phase !== 'running' || !startMs.current) return;
    const id = window.setInterval(() => {
      setLiveWpm(wpmFrom(Math.max(0, correctCount), startMs.current, Date.now()));
    }, 200);
    return () => clearInterval(id);
  }, [phase, correctCount]);

  const endLesson = useCallback(
    async (passed: boolean, reason: string, typedLen: number, errSet: Set<number>) => {
      const end = Date.now();
      const correct = typedLen - errSet.size;
      const incorrect = errSet.size;
      const wpm = wpmFrom(Math.max(0, correct), startMs.current, end);
      const accuracy = accuracyOf(Math.max(0, correct), incorrect);
      setFinalStats({ wpm, accuracy, correct: Math.max(0, correct), incorrect });
      setFailReason(reason);
      setPhase(passed ? 'passed' : 'failed');

      if (passed) playCompleteChime();
      else playErrorBeep();

      if (passed && lesson) {
        const next = markLessonPassed(lesson, { accuracy, wpm });
        setProgress(next);
      }

      if (!submitted.current && lesson) {
        submitted.current = true;
        const elapsed = startMs.current ? Math.round((end - startMs.current) / 1000) : 1;
        await submitPlayResult(
          {
            modeId: 'lesson-path',
            title: `Lesson · ${lesson.title}${passed ? ' ✓' : ' ✗'}`,
            content: text,
            wpm,
            accuracy,
            errors: incorrect,
            timeTaken: Math.max(1, elapsed),
            wordCount: text.split(/\s+/).filter(Boolean).length,
            score: passed ? 1000 + wpm : wpm,
            scoreLabel: passed ? 'Passed' : 'Failed',
          },
          !!user
        );
      }
    },
    [lesson, text, user]
  );

  const evaluatePass = useCallback(
    (typedLen: number, errSet: Set<number>, currentStreak: number) => {
      if (!lesson) return;
      const correct = typedLen - errSet.size;
      const incorrect = errSet.size;
      const acc = accuracyOf(Math.max(0, correct), incorrect);
      const wpm = wpmFrom(Math.max(0, correct), startMs.current, Date.now());

      // Mid-run accuracy gate
      if (lesson.mechanic === 'accuracy_gate' && typedLen >= (lesson.minChars ?? 15)) {
        if (acc < (lesson.minAccuracy ?? 94)) {
          void endLesson(
            false,
            `Accuracy dropped to ${acc}% (need ${lesson.minAccuracy}%)`,
            typedLen,
            errSet
          );
          return true;
        }
      }

      // Char streak win
      if (lesson.mechanic === 'char_streak') {
        if (currentStreak >= (lesson.streakTarget ?? 80)) {
          void endLesson(true, 'Streak complete', typedLen, errSet);
          return true;
        }
        // Fail if ran out of text without streak
        if (typedLen >= text.length) {
          void endLesson(
            false,
            `Best streak ${Math.max(currentStreak, bestStreak)} / ${lesson.streakTarget}`,
            typedLen,
            errSet
          );
          return true;
        }
        return false;
      }

      // Finished passage
      if (typedLen >= text.length) {
        if (lesson.mechanic === 'speed_check') {
          const okAcc = acc >= (lesson.minAccuracy ?? 94);
          const okWpm = wpm >= (lesson.minWpm ?? 40);
          if (okAcc && okWpm) {
            void endLesson(true, `${wpm} WPM · ${acc}%`, typedLen, errSet);
          } else {
            void endLesson(
              false,
              `Got ${wpm} WPM / ${acc}% — need ${lesson.minWpm}+ WPM & ${lesson.minAccuracy}%+`,
              typedLen,
              errSet
            );
          }
          return true;
        }

        const minAcc = lesson.minAccuracy ?? 92;
        if (acc >= minAcc) {
          void endLesson(true, `${acc}% accuracy`, typedLen, errSet);
        } else {
          void endLesson(false, `${acc}% accuracy — need ${minAcc}%+`, typedLen, errSet);
        }
        return true;
      }

      return false;
    },
    [lesson, text.length, bestStreak, endLesson]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!lesson || phase === 'map' || phase === 'passed' || phase === 'failed') return;
      if (isNonPrintingKey(e.key) && e.key !== 'Backspace') return;
      e.preventDefault();

      if (phase === 'ready' && e.key.length === 1) {
        setPhase('running');
        startMs.current = Date.now();
      }

      // No backspace lesson
      if (e.key === 'Backspace') {
        if (lesson.mechanic === 'no_backspace') {
          playErrorBeep();
          return;
        }
        if (typed.length > 0) {
          const prev = typed.length - 1;
          setTyped((t) => t.slice(0, -1));
          setErrors((prevSet) => {
            const n = new Set(prevSet);
            n.delete(prev);
            return n;
          });
          setStreak(0);
        }
        return;
      }

      if (e.key.length !== 1) return;
      if (typed.length >= text.length) return;

      const expected = text[typed.length]!;
      const correct = e.key === expected;
      recordKeyAttempt(expected, correct);

      const nextLen = typed.length + 1;
      const nextErrors = new Set(errors);
      let nextStreak = streak;

      if (!correct) {
        nextErrors.add(typed.length);
        nextStreak = 0;
        playErrorBeep();
      } else {
        nextStreak = streak + 1;
        setBestStreak((b) => Math.max(b, nextStreak));
        playKeyClick();
      }

      setTyped((t) => t + e.key);
      setErrors(nextErrors);
      setStreak(nextStreak);

      evaluatePass(nextLen, nextErrors, nextStreak);
    },
    [lesson, phase, typed, text, errors, streak, evaluatePass]
  );

  if (phase === 'map') {
    const pct = curriculumCompletionPercent(progress);
    return (
      <PlayShell
        modeId="lesson-path"
        title="Lesson path"
        subtitle="Unlock the keyboard step by step. Each lesson has a different rule — not the same test twice."
        onExit={exit}
      >
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-accent/15 bg-accent/[0.05] px-4 py-3.5">
          <div>
            <p className="text-sm font-medium tracking-tight">Path progress</p>
            <p className="text-xs text-text/40 mt-0.5">
              {progress.completed.length} / {CURRICULUM.length} lessons cleared
            </p>
          </div>
          <p className="font-mono text-2xl font-semibold text-accent tabular-nums">{pct}%</p>
        </div>
        <div className="h-1.5 rounded-full bg-accent/20 overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{ width: `${pct}%` }}
          />
        </div>

        <ol className="space-y-2">
          {CURRICULUM.map((l) => {
            const unlocked = isLessonUnlocked(l, progress);
            const done = isLessonComplete(l, progress);
            const best = progress.bests[l.id];
            return (
              <li key={l.id}>
                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => openLesson(l)}
                  className={cn(
                    'w-full text-left rounded-lg border p-4 flex gap-4 items-start',
                    'transition-[background-color,border-color,transform,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
                    unlocked
                      ? 'border-accent/15 bg-accent/[0.05] hover:bg-accent/10 hover:border-accent/30 cursor-pointer active:scale-[0.995]'
                      : 'border-transparent bg-primary/15 opacity-45 cursor-not-allowed'
                  )}
                >
                  <div
                    className={cn(
                      'size-9 rounded-lg flex items-center justify-center shrink-0 font-mono text-sm',
                      done
                        ? 'bg-success/15 text-success'
                        : unlocked
                          ? 'bg-accent/20 text-accent'
                          : 'bg-text/8 text-text/35'
                    )}
                  >
                    {done ? (
                      <Check className="size-4" />
                    ) : unlocked ? (
                      l.index + 1
                    ) : (
                      <Lock className="size-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold tracking-tight">{l.title}</h3>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-text/35">
                        {l.mechanic.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-text/48 mt-0.5 leading-relaxed">{l.subtitle}</p>
                    <p className="text-xs text-text/38 mt-2 font-mono">{l.passRule}</p>
                    {best && (
                      <p className="text-xs text-accent/75 mt-1.5 font-mono">
                        Best {best.wpm} WPM · {best.accuracy}%
                      </p>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </PlayShell>
    );
  }

  if ((phase === 'passed' || phase === 'failed') && lesson) {
    return (
      <PlayShell modeId="lesson-path" title={lesson.title} onExit={exit}>
        <PlayResultCard
          title={phase === 'passed' ? 'Lesson passed' : 'Not yet'}
          isNewBest={phase === 'passed'}
          stats={[
            { label: 'WPM', value: finalStats.wpm },
            { label: 'Accuracy', value: `${finalStats.accuracy}%` },
            { label: 'Errors', value: finalStats.incorrect },
          ]}
          onRetry={() => openLesson(lesson)}
          onExit={() => setPhase('map')}
        />
        <p className="text-center text-sm text-text/50">{failReason}</p>
        {phase === 'passed' && lesson.index < CURRICULUM.length - 1 && (
          <div className="flex justify-center">
            <Button
              onClick={() => {
                const next = CURRICULUM[lesson.index + 1]!;
                openLesson(next);
              }}
            >
              Next lesson →
            </Button>
          </div>
        )}
        {phase === 'passed' && lesson.index === CURRICULUM.length - 1 && (
          <p className="text-center text-accent font-medium">Path complete. You graduated.</p>
        )}
      </PlayShell>
    );
  }

  if (!lesson) return null;

  const charStatus = (i: number): CharStatus => {
    if (i < typed.length) return errors.has(i) ? 'incorrect' : 'correct';
    if (i === typed.length) return 'current';
    return 'pending';
  };

  const stats = [
    {
      label: 'WPM',
      value: phase === 'running' ? liveWpm : '—',
      accent: true,
    },
    {
      label: 'Accuracy',
      value: typed.length ? `${accuracyOf(Math.max(0, correctCount), incorrectCount)}%` : '—',
    },
    lesson.mechanic === 'char_streak'
      ? { label: 'Streak', value: `${streak}/${lesson.streakTarget}` }
      : { label: 'Progress', value: `${typed.length}/${text.length}` },
  ];
  if (lesson.mechanic === 'no_backspace') {
    stats.push({ label: 'Backspace', value: 'off' });
  }

  return (
    <PlayShell
      modeId="lesson-path"
      title={lesson.title}
      subtitle={lesson.passRule}
      onExit={() => setPhase('map')}
    >
      <PlayTestPanel
        stats={stats}
        meter={text.length ? typed.length / text.length : 0}
        meterActive={phase === 'running'}
        onRestart={() => openLesson(lesson)}
        actions={
          <Button variant="ghost" size="sm" onClick={() => setPhase('map')}>
            Path map
          </Button>
        }
      >
        <TypingSurface
          text={text}
          getStatus={charStatus}
          caretIndex={typed.length}
          onKeyDown={onKeyDown}
          surfaceRef={focusRef}
          ariaLabel={`Lesson: ${lesson.title}`}
          trailingAnchor
        />
        {phase === 'ready' && (
          <PanelHint>
            <Kbd>type</Kbd> to begin · {lesson.subtitle}
          </PanelHint>
        )}
      </PlayTestPanel>
    </PlayShell>
  );
};
