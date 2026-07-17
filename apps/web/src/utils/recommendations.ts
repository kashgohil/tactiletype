import type { ErrorAnalysisSummary } from '@tactile/types';

export type RecommendedExercise = {
  id: string;
  title: string;
  description: string;
  reason: string;
  /** Path with search for /practice or /test */
  href: string;
  priority: number;
};

/**
 * v1 rule-based recommendations (PRODUCT_PLAN §5.4).
 * 1. Weak keys → key drill
 * 2. Low accuracy last tests → accuracy challenge
 * 3. Streak at risk → short timer test
 * 4. Else → curriculum / random pack
 */
export function buildRecommendation(input: {
  errorAnalysis?: ErrorAnalysisSummary | null;
  recentAvgAccuracy?: number | null;
  currentStreak?: number;
  lastPracticeHoursAgo?: number | null;
}): RecommendedExercise {
  const weakKeys =
    input.errorAnalysis?.mostProblematicChars
      ?.slice(0, 5)
      .map((c) => c.character)
      .filter(Boolean) ?? [];

  if (weakKeys.length >= 2) {
    const keys = weakKeys.join(',');
    return {
      id: 'weak-keys',
      title: `Practice weak keys: ${weakKeys.map((k) => k.toUpperCase()).join(' ')}`,
      description: 'Targeted drill built from your recent error heatmap.',
      reason: 'Clear weak keys detected',
      href: `/practice?drill=keys&keys=${encodeURIComponent(keys)}`,
      priority: 5,
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
      priority: 4,
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
      reason: 'Streak at risk — no practice in 20h+',
      href: '/test?mode=timer&duration=30',
      priority: 3,
    };
  }

  return {
    id: 'explore',
    title: 'Browse practice packs',
    description: 'Word lists, quotes, symbols, and code drills await.',
    reason: 'No urgent weak spots — explore the library',
    href: '/practice',
    priority: 1,
  };
}
