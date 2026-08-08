import type { ErrorAnalysisSummary } from '@tactile/types';
import { curriculumCompletionPercent, loadCurriculumProgress } from '@/utils/curriculum';
import { mergeWeakKeys } from '@/utils/weakKeys';

export type RecommendedExercise = {
  id: string;
  title: string;
  description: string;
  reason: string;
  /** Path with search for /practice, /play, or /test */
  href: string;
  priority: number;
};

/**
 * Rule-based recommendations - prefer unique play modes over more categories.
 * 1. Weak keys → Weak Storm (adaptive)
 * 2. Curriculum incomplete → next lesson
 * 3. Low accuracy → accuracy drill
 * 4. Streak at risk → short timer
 * 5. Else → explore play modes
 */
export function buildRecommendation(input: {
  errorAnalysis?: ErrorAnalysisSummary | null;
  recentAvgAccuracy?: number | null;
  currentStreak?: number;
  lastPracticeHoursAgo?: number | null;
}): RecommendedExercise {
  const weakKeys = mergeWeakKeys(input.errorAnalysis?.mostProblematicChars, 5);

  if (weakKeys.length >= 2) {
    return {
      id: 'weak-storm',
      title: `Weak Storm: ${weakKeys.map((k) => k.toUpperCase()).join(' ')}`,
      description: 'Rising-timer storm aimed at the keys you miss most - not the same free test.',
      reason: 'Weak keys detected from your recent typing',
      href: '/play/weak-storm',
      priority: 5,
    };
  }

  const progress = loadCurriculumProgress();
  const pct = curriculumCompletionPercent(progress);
  if (pct < 100) {
    return {
      id: 'lesson-path',
      title: pct === 0 ? 'Start the lesson path' : `Continue lessons (${pct}%)`,
      description:
        'Home row → no-backspace → speed checks. Unlock each stage with a real pass rule.',
      reason:
        pct === 0
          ? 'Structured path builds speed faster than random tests'
          : 'You still have lessons left on the path',
      href: '/play/lesson-path',
      priority: 4,
    };
  }

  if (
    input.recentAvgAccuracy != null &&
    input.recentAvgAccuracy > 0 &&
    input.recentAvgAccuracy < 95
  ) {
    return {
      id: 'accuracy',
      title: 'Accuracy challenge',
      description: 'Slow down and aim for 98%+ on a short passage.',
      reason: `Recent accuracy around ${input.recentAvgAccuracy.toFixed(0)}%`,
      href: '/practice?drill=accuracy',
      priority: 3,
    };
  }

  if (
    (input.currentStreak ?? 0) > 0 &&
    input.lastPracticeHoursAgo != null &&
    input.lastPracticeHoursAgo >= 20
  ) {
    return {
      id: 'streak',
      title: 'Keep your streak',
      description: 'A quick 30-second test keeps the fire going.',
      reason: 'Streak at risk - no practice in 20h+',
      href: '/test?mode=timer&duration=30',
      priority: 3,
    };
  }

  // Prefer today's rotating mode for variety
  return {
    id: 'daily-mode',
    title: "Today's play mode",
    description:
      'A rotating ranked mode (Sudden Death, Storm, Ghost…) - different rules every UTC day.',
    reason: 'Keep skills sharp with daily variety',
    href: '/daily',
    priority: 1,
  };
}
