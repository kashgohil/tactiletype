import type {
  DetailedKeystrokeEvent,
  KeystrokeAnalytics,
  ErrorAnalytics,
  ErrorPattern,
  KeystrokeStats,
  KeySpeed,
  KeyAccuracy,
  PerformanceTrend,
  CharacterError,
  WordError,
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
      const timeDiff = keystrokeEvents[i].timestamp - keystrokeEvents[i - 1].timestamp;
      keystrokeTimes.push(timeDiff);
      keystrokeEvents[i].timeSincePrevious = timeDiff;
    }

    // Calculate average keystroke time
    const averageKeystrokeTime = keystrokeTimes.length > 0 
      ? keystrokeTimes.reduce((sum, time) => sum + time, 0) / keystrokeTimes.length
      : 0;

    // Calculate variance
    const variance = keystrokeTimes.length > 0
      ? keystrokeTimes.reduce((sum, time) => sum + Math.pow(time - averageKeystrokeTime, 2), 0) / keystrokeTimes.length
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

    const mean = keystrokeTimes.reduce((sum, time) => sum + time, 0) / keystrokeTimes.length;
    const variance = keystrokeTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / keystrokeTimes.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Calculate coefficient of variation (lower is more consistent)
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 1;
    
    // Convert to consistency score (0-100, higher is better)
    const consistencyScore = Math.max(0, 100 - (coefficientOfVariation * 100));
    
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
          characterErrors[expectedChar] = (characterErrors[expectedChar] || 0) + 1;
        }

        // Find word containing this error
        const wordIndex = event.wordIndex;
        if (wordIndex >= 0 && wordIndex < words.length) {
          const word = words[wordIndex];
          wordErrors[word] = (wordErrors[word] || 0) + 1;
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
  static identifyErrorPatterns(keystrokeEvents: DetailedKeystrokeEvent[]): ErrorPattern[] {
    const patterns: Map<string, { frequency: number; contexts: string[] }> = new Map();

    for (let i = 0; i < keystrokeEvents.length - 1; i++) {
      const current = keystrokeEvents[i];
      const next = keystrokeEvents[i + 1];

      if (!current.correct || !next.correct) {
        const pattern = `${current.expectedChar}->${current.actualChar}`;
        const context = keystrokeEvents.slice(Math.max(0, i - 2), i + 3)
          .map(e => e.expectedChar)
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
        context: data.contexts[0], // Use first context as representative
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
      const [expected, actual] = pattern.split('->');
      
      // Common finger placement errors
      const fingerMappings: Record<string, string[]> = {
        'a': ['s', 'q', 'z'],
        's': ['a', 'd', 'w', 'x'],
        'd': ['s', 'f', 'e', 'c'],
        'f': ['d', 'g', 'r', 'v'],
        // Add more mappings as needed
      };

      if (fingerMappings[expected]?.includes(actual)) {
        suggestions.push('Focus on proper finger placement');
        suggestions.push('Practice typing this character slowly');
      }

      if (expected.toLowerCase() !== expected && actual.toLowerCase() === actual) {
        suggestions.push('Remember to use Shift for capital letters');
      }

      if (expected === ' ' && actual !== ' ') {
        suggestions.push('Practice using spacebar with thumb');
      }
    }

    if (suggestions.length === 0) {
      suggestions.push('Practice this character combination');
    }

    return suggestions;
  }

  /**
   * Calculate detailed keystroke statistics
   */
  static calculateKeystrokeStats(keystrokeEvents: DetailedKeystrokeEvent[]): KeystrokeStats {
    const keyTimes: Map<string, number[]> = new Map();
    const keyAccuracy: Map<string, { correct: number; total: number }> = new Map();

    keystrokeEvents.forEach((event) => {
      const key = event.expectedChar;
      
      // Track timing
      if (event.timeSincePrevious !== undefined) {
        if (!keyTimes.has(key)) {
          keyTimes.set(key, []);
        }
        keyTimes.get(key)!.push(event.timeSincePrevious);
      }

      // Track accuracy
      if (!keyAccuracy.has(key)) {
        keyAccuracy.set(key, { correct: 0, total: 0 });
      }
      const accuracy = keyAccuracy.get(key)!;
      accuracy.total++;
      if (event.correct) {
        accuracy.correct++;
      }
    });

    // Calculate average times and sort
    const keySpeedData: KeySpeed[] = Array.from(keyTimes.entries())
      .map(([key, times]) => ({
        key,
        averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
        frequency: times.length,
      }))
      .sort((a, b) => a.averageTime - b.averageTime);

    // Calculate accuracy percentages and sort
    const keyAccuracyData: KeyAccuracy[] = Array.from(keyAccuracy.entries())
      .map(([key, data]) => ({
        key,
        accuracy: (data.correct / data.total) * 100,
        frequency: data.total,
      }))
      .sort((a, b) => b.accuracy - a.accuracy);

    const allTimes = Array.from(keyTimes.values()).flat();
    const averageTime = allTimes.length > 0 
      ? allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length 
      : 0;
    
    const variance = allTimes.length > 0
      ? allTimes.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / allTimes.length
      : 0;

    return {
      averageTime,
      variance,
      fastestKeys: keySpeedData.slice(0, 10),
      slowestKeys: keySpeedData.slice(-10).reverse(),
      mostAccurateKeys: keyAccuracyData.slice(0, 10),
      leastAccurateKeys: keyAccuracyData.slice(-10).reverse(),
    };
  }

  /**
   * Calculate performance trends over time
   */
  static calculatePerformanceTrends(
    historicalData: Array<{ date: string; wpm: number; accuracy: number; consistency: number }>
  ): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];
    const metrics = ['wpm', 'accuracy', 'consistency'] as const;

    metrics.forEach((metric) => {
      const values = historicalData.map(d => d[metric]);
      if (values.length < 2) return;

      // Determine trend direction and percentage change
      const firstValue = values[0];
      const lastValue = values[values.length - 1];
      const changePercentage = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

      let trend: 'up' | 'down' | 'stable';
      if (Math.abs(changePercentage) < 2) {
        trend = 'stable';
      } else if (changePercentage > 0) {
        trend = 'up';
      } else {
        trend = 'down';
      }

      trends.push({
        metric,
        timeframe: 'recent',
        trend,
        changePercentage: Math.round(changePercentage * 100) / 100,
        dataPoints: values.length,
      });
    });

    return trends;
  }

  /**
   * Generate character and word error summaries
   */
  static generateErrorSummaries(
    characterErrors: Record<string, number>,
    wordErrors: Record<string, number>,
    totalCharacters: number,
    totalWords: number
  ): { characterSummary: CharacterError[]; wordSummary: WordError[] } {
    const characterSummary: CharacterError[] = Object.entries(characterErrors)
      .map(([character, errorCount]) => ({
        character,
        errorCount,
        errorRate: (errorCount / totalCharacters) * 100,
        suggestions: this.generateErrorSuggestions(`${character}->`),
      }))
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 10);

    const wordSummary: WordError[] = Object.entries(wordErrors)
      .map(([word, errorCount]) => ({
        word,
        errorCount,
        errorRate: (errorCount / totalWords) * 100,
        commonMistakes: [], // This would be populated with actual mistake data
      }))
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 10);

    return { characterSummary, wordSummary };
  }

  /**
   * Calculate improvement recommendations based on analytics
   */
  static generateRecommendations(
    keystrokeStats: KeystrokeStats,
    errorAnalytics: ErrorAnalytics,
    performanceTrends: PerformanceTrend[]
  ): Array<{ type: string; title: string; description: string; priority: number }> {
    const recommendations: Array<{ type: string; title: string; description: string; priority: number }> = [];

    // Speed recommendations
    if (keystrokeStats.slowestKeys.length > 0) {
      const slowestKey = keystrokeStats.slowestKeys[0];
      recommendations.push({
        type: 'practice_focus',
        title: `Improve speed for "${slowestKey.key}"`,
        description: `Focus on typing "${slowestKey.key}" faster. Current average: ${slowestKey.averageTime.toFixed(1)}ms`,
        priority: 4,
      });
    }

    // Accuracy recommendations
    if (keystrokeStats.leastAccurateKeys.length > 0) {
      const leastAccurate = keystrokeStats.leastAccurateKeys[0];
      recommendations.push({
        type: 'practice_focus',
        title: `Improve accuracy for "${leastAccurate.key}"`,
        description: `Focus on typing "${leastAccurate.key}" more accurately. Current accuracy: ${leastAccurate.accuracy.toFixed(1)}%`,
        priority: 5,
      });
    }

    // Error pattern recommendations
    if (errorAnalytics.errorPatterns.length > 0) {
      const topPattern = errorAnalytics.errorPatterns[0];
      recommendations.push({
        type: 'improvement_tip',
        title: 'Common Error Pattern Detected',
        description: `You frequently make the error "${topPattern.pattern}". ${topPattern.suggestions[0] || 'Practice this pattern slowly.'}`,
        priority: 4,
      });
    }

    // Trend-based recommendations
    const wpmTrend = performanceTrends.find(t => t.metric === 'wpm');
    if (wpmTrend && wpmTrend.trend === 'down') {
      recommendations.push({
        type: 'goal_suggestion',
        title: 'Speed Improvement Needed',
        description: `Your typing speed has decreased by ${Math.abs(wpmTrend.changePercentage).toFixed(1)}%. Consider setting a speed improvement goal.`,
        priority: 3,
      });
    }

    const accuracyTrend = performanceTrends.find(t => t.metric === 'accuracy');
    if (accuracyTrend && accuracyTrend.trend === 'down') {
      recommendations.push({
        type: 'goal_suggestion',
        title: 'Accuracy Focus Recommended',
        description: `Your accuracy has decreased by ${Math.abs(accuracyTrend.changePercentage).toFixed(1)}%. Focus on accuracy over speed.`,
        priority: 5,
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }
}