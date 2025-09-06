import type {
  DetailedKeystrokeEvent,
  ErrorAnalytics,
  ErrorPattern,
  KeystrokeAnalytics,
} from '@tactile/types';

export class AnalyticsEngine {
  /**
   * Calculate detailed keystroke analytics from raw keystroke data
   */
  static calculateKeystrokeAnalytics(
    keystrokeEvents: DetailedKeystrokeEvent[]
  ): Omit<KeystrokeAnalytics, 'id' | 'testResultId' | 'userId' | 'createdAt'> {
    if (keystrokeEvents.length === 0) {
      return {
        keystrokeData: [],
        averageKeystrokeTime: 0,
        keystrokeVariance: 0,
        typingRhythm: 0,
      };
    }

    // Calculate timing between keystrokes
    const keystrokeTimes: number[] = [];
    for (let i = 1; i < keystrokeEvents.length; i++) {
      const current = keystrokeEvents[i];
      const previous = keystrokeEvents[i - 1];
      if (current && previous) {
        const timeDiff = current.timestamp - previous.timestamp;
        keystrokeTimes.push(timeDiff);
        current.timeSincePrevious = timeDiff;
      }
    }

    // Calculate average keystroke time
    const averageKeystrokeTime =
      keystrokeTimes.length > 0
        ? keystrokeTimes.reduce((sum, time) => sum + time, 0) /
          keystrokeTimes.length
        : 0;

    // Calculate variance
    const variance =
      keystrokeTimes.length > 0
        ? keystrokeTimes.reduce(
            (sum, time) => sum + Math.pow(time - averageKeystrokeTime, 2),
            0
          ) / keystrokeTimes.length
        : 0;

    // Calculate typing rhythm (consistency score)
    const typingRhythm = this.calculateTypingRhythm(keystrokeTimes);

    return {
      keystrokeData: keystrokeEvents,
      averageKeystrokeTime: Math.round(averageKeystrokeTime * 1000) / 1000, // Round to 3 decimal places
      keystrokeVariance: Math.round(variance * 1000) / 1000,
      typingRhythm: Math.round(typingRhythm * 100) / 100,
    };
  }

  /**
   * Calculate typing rhythm and consistency score
   */
  static calculateTypingRhythm(keystrokeTimes: number[]): number {
    if (keystrokeTimes.length < 2) return 100;

    const mean =
      keystrokeTimes.reduce((sum, time) => sum + time, 0) /
      keystrokeTimes.length;
    const variance =
      keystrokeTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) /
      keystrokeTimes.length;
    const standardDeviation = Math.sqrt(variance);

    // Calculate coefficient of variation (lower is more consistent)
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 1;

    // Convert to consistency score (0-100, higher is better)
    const consistencyScore = Math.max(0, 100 - coefficientOfVariation * 100);

    return consistencyScore;
  }

  /**
   * Analyze error patterns from keystroke data
   */
  static analyzeErrors(
    keystrokeEvents: DetailedKeystrokeEvent[],
    originalText: string
  ): Omit<ErrorAnalytics, 'id' | 'testResultId' | 'userId' | 'createdAt'> {
    const characterErrors: Record<string, number> = {};
    const wordErrors: Record<string, number> = {};
    const words = originalText.split(' ');

    // Analyze character-level errors
    keystrokeEvents.forEach((event) => {
      if (!event.correct) {
        const expectedChar = event.expectedChar;

        // Count character errors
        if (expectedChar) {
          characterErrors[expectedChar] =
            (characterErrors[expectedChar] || 0) + 1;
        }

        // Find word containing this error
        const wordIndex = event.wordIndex;
        if (wordIndex >= 0 && wordIndex < words.length) {
          const word = words[wordIndex];
          if (word) {
            wordErrors[word] = (wordErrors[word] || 0) + 1;
          }
        }
      }
    });

    // Identify error patterns
    const patterns = this.identifyErrorPatterns(keystrokeEvents);

    // Get most problematic characters
    const mostProblematicChars = Object.entries(characterErrors)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([char]) => char);

    return {
      characterErrors,
      wordErrors,
      errorPatterns: patterns,
      mostProblematicChars,
    };
  }

  /**
   * Identify common error patterns
   */
  static identifyErrorPatterns(
    keystrokeEvents: DetailedKeystrokeEvent[]
  ): ErrorPattern[] {
    const patterns: Map<string, { frequency: number; contexts: string[] }> =
      new Map();

    for (let i = 0; i < keystrokeEvents.length - 1; i++) {
      const current = keystrokeEvents[i];
      const next = keystrokeEvents[i + 1];

      if (current && next && (!current.correct || !next.correct)) {
        const pattern = `${current.expectedChar}->${current.actualChar}`;
        const context = keystrokeEvents
          .slice(Math.max(0, i - 2), i + 3)
          .map((e) => e?.expectedChar || '')
          .join('');

        if (!patterns.has(pattern)) {
          patterns.set(pattern, { frequency: 0, contexts: [] });
        }

        const patternData = patterns.get(pattern)!;
        patternData.frequency++;
        if (!patternData.contexts.includes(context)) {
          patternData.contexts.push(context);
        }
      }
    }

    return Array.from(patterns.entries())
      .filter(([, data]) => data.frequency >= 2) // Only patterns that occur multiple times
      .map(([pattern, data]) => ({
        pattern,
        frequency: data.frequency,
        context: data.contexts[0] || '', // Use first context as representative
        suggestions: this.generateErrorSuggestions(pattern),
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10); // Top 10 patterns
  }

  /**
   * Generate improvement suggestions for error patterns
   */
  static generateErrorSuggestions(pattern: string): string[] {
    const suggestions: string[] = [];

    if (pattern.includes('->')) {
      const parts = pattern.split('->');
      const expected = parts[0];
      const actual = parts[1];

      if (expected && actual) {
        // Common finger placement errors
        const fingerMappings: Record<string, string[]> = {
          a: ['s', 'q', 'z'],
          s: ['a', 'd', 'w', 'x'],
          d: ['s', 'f', 'e', 'c'],
          f: ['d', 'g', 'r', 'v'],
          // Add more mappings as needed
        };

        if (fingerMappings[expected]?.includes(actual)) {
          suggestions.push('Focus on proper finger placement');
          suggestions.push('Practice typing this character slowly');
        }

        if (
          expected.toLowerCase() !== expected &&
          actual.toLowerCase() === actual
        ) {
          suggestions.push('Remember to use Shift for capital letters');
        }

        if (expected === ' ' && actual !== ' ') {
          suggestions.push('Practice using spacebar with thumb');
        }
      }
    }

    if (suggestions.length === 0) {
      suggestions.push('Practice this character combination');
    }

    return suggestions;
  }

  /**
   * Calculate user statistics and streaks from completed tests
   */
  static calculateUserStats(
    tests: Array<{
      wpm: string;
      accuracy: string;
      timeTaken: number;
      completedAt: Date;
    }>
  ) {
    if (tests.length === 0) {
      return {
        totalTests: 0,
        bestWpm: 0,
        bestAccuracy: 0,
        avgWpm: 0,
        avgAccuracy: 0,
        totalTime: 0,
        currentStreak: 0,
        longestStreak: 0,
      };
    }

    // Calculate basic statistics
    const totalTests = tests.length;
    const bestWpm = Math.max(...tests.map((r) => parseFloat(r.wpm)));
    const bestAccuracy = Math.max(...tests.map((r) => parseFloat(r.accuracy)));
    const avgWpm =
      Math.round(
        (tests.reduce((sum, r) => sum + parseFloat(r.wpm), 0) / tests.length) *
          100
      ) / 100;
    const avgAccuracy =
      Math.round(
        (tests.reduce((sum, r) => sum + parseFloat(r.accuracy), 0) /
          tests.length) *
          100
      ) / 100;
    const totalTime = tests.reduce((sum, r) => sum + r.timeTaken, 0);

    // Calculate streaks
    const testDates = tests.map(
      (test) => test.completedAt.toISOString().split('T')[0]
    );
    const uniqueDates = [...new Set(testDates)].sort();

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0] || '';
    let checkDate: string = today;

    while (checkDate && uniqueDates.includes(checkDate)) {
      currentStreak++;
      const date = new Date(checkDate);
      date.setDate(date.getDate() - 1);
      checkDate = date.toISOString().split('T')[0] || '';
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDateStr = uniqueDates[i - 1];
      const currDateStr = uniqueDates[i];

      if (prevDateStr && currDateStr) {
        const prevDate = new Date(prevDateStr);
        const currDate = new Date(currDateStr);
        const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return {
      totalTests,
      bestWpm,
      bestAccuracy,
      avgWpm,
      avgAccuracy,
      totalTime,
      currentStreak,
      longestStreak,
    };
  }
}
