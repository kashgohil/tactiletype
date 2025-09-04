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
}
