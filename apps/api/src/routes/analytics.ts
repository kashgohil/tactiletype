import { db } from '@tactile/database';
import {
  completedTests,
  errorAnalytics,
  keystrokeAnalytics,
  performanceInsights,
  userGoals,
  userRecommendations,
} from '@tactile/database/src/schema';
import type { JWTPayload } from '@tactile/types';
import { and, desc, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { JWT_SECRET } from '../constants';

const analytics = new Hono();

// JWT middleware for protected routes
analytics.use(
  '/*',
  jwt({
    secret: JWT_SECRET,
  })
);

// Get user analytics overview
analytics.get('/overview', async (c) => {
  try {
    const payload = c.get('jwtPayload') as JWTPayload;
    const userId = payload.userId;

    // Get basic stats
    const userResults = await db
      .select({
        totalTests: sql<number>`count(*)`,
        avgWpm: sql<number>`avg(${completedTests.wpm})`,
        bestWpm: sql<number>`max(${completedTests.wpm})`,
        avgAccuracy: sql<number>`avg(${completedTests.accuracy})`,
        bestAccuracy: sql<number>`max(${completedTests.accuracy})`,
        totalTimeSpent: sql<number>`sum(${completedTests.timeTaken})`,
      })
      .from(completedTests)
      .where(eq(completedTests.userId, userId));

    // Get recent performance insights
    const recentInsights = await db
      .select()
      .from(performanceInsights)
      .where(eq(performanceInsights.userId, userId))
      .orderBy(desc(performanceInsights.date))
      .limit(30);

    // Calculate improvement rate and consistency
    let improvementRate = 0;
    let consistencyScore = 0;

    if (recentInsights.length >= 2) {
      const recent = recentInsights[0];
      const older = recentInsights[recentInsights.length - 1];

      if (recent && older && older.avgWpm && recent.avgWpm) {
        improvementRate =
          ((Number(recent.avgWpm) - Number(older.avgWpm)) /
            Number(older.avgWpm)) *
          100;
      }

      consistencyScore =
        recentInsights.reduce(
          (sum, insight) => sum + Number(insight.consistencyScore || 0),
          0
        ) / recentInsights.length;
    }

    const overview = {
      totalTests: Number(userResults[0]?.totalTests || 0),
      totalTimeSpent: Number(userResults[0]?.totalTimeSpent || 0),
      averageWpm: Math.round(Number(userResults[0]?.avgWpm || 0) * 100) / 100,
      bestWpm: Math.round(Number(userResults[0]?.bestWpm || 0) * 100) / 100,
      averageAccuracy:
        Math.round(Number(userResults[0]?.avgAccuracy || 0) * 100) / 100,
      bestAccuracy:
        Math.round(Number(userResults[0]?.bestAccuracy || 0) * 100) / 100,
      improvementRate: Math.round(improvementRate * 100) / 100,
      consistencyScore: Math.round(consistencyScore * 100) / 100,
      currentStreak: 0, // TODO: Calculate streak
      longestStreak: 0, // TODO: Calculate streak
    };

    return c.json({ overview });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    return c.json({ error: 'Failed to fetch analytics overview' }, 500);
  }
});

// Get performance trends
analytics.get('/trends', async (c) => {
  try {
    const payload = c.get('jwtPayload') as JWTPayload;
    const userId = payload.userId;
    const timeframe = c.req.query('timeframe') || 'weekly';
    const limit = parseInt(c.req.query('limit') || '30');

    const insights = await db
      .select()
      .from(performanceInsights)
      .where(
        and(
          eq(performanceInsights.userId, userId),
          eq(performanceInsights.timeframe, timeframe)
        )
      )
      .orderBy(desc(performanceInsights.date))
      .limit(limit);

    // Transform data for charts
    const wpmData = insights
      .map((insight) => ({
        date: insight.date.toISOString().split('T')[0],
        value: Number(insight.avgWpm || 0),
      }))
      .reverse();

    const accuracyData = insights
      .map((insight) => ({
        date: insight.date.toISOString().split('T')[0],
        value: Number(insight.avgAccuracy || 0),
      }))
      .reverse();

    const consistencyData = insights
      .map((insight) => ({
        date: insight.date.toISOString().split('T')[0],
        value: Number(insight.consistencyScore || 0),
      }))
      .reverse();

    // Calculate trends
    const calculateTrend = (data: Array<{ value: number }>) => {
      if (data.length < 2) return { trend: 'stable', trendPercentage: 0 };

      const first = data[0]?.value || 0;
      const last = data[data.length - 1]?.value || 0;
      const percentage = first !== 0 ? ((last - first) / first) * 100 : 0;

      let trend: 'improving' | 'declining' | 'stable';
      if (Math.abs(percentage) < 2) {
        trend = 'stable';
      } else if (percentage > 0) {
        trend = 'improving';
      } else {
        trend = 'declining';
      }

      return { trend, trendPercentage: Math.round(percentage * 100) / 100 };
    };

    const progressCharts = [
      {
        type: 'wpm',
        timeframe,
        data: wpmData,
        ...calculateTrend(wpmData),
      },
      {
        type: 'accuracy',
        timeframe,
        data: accuracyData,
        ...calculateTrend(accuracyData),
      },
      {
        type: 'consistency',
        timeframe,
        data: consistencyData,
        ...calculateTrend(consistencyData),
      },
    ];

    return c.json({ progressCharts });
  } catch (error) {
    console.error('Error fetching performance trends:', error);
    return c.json({ error: 'Failed to fetch performance trends' }, 500);
  }
});

// Get error analysis
analytics.get('/errors', async (c) => {
  try {
    const payload = c.get('jwtPayload') as JWTPayload;
    const userId = payload.userId;
    const limit = parseInt(c.req.query('limit') || '10');

    const errorData = await db
      .select()
      .from(errorAnalytics)
      .where(eq(errorAnalytics.userId, userId))
      .orderBy(desc(errorAnalytics.createdAt))
      .limit(limit);

    // Aggregate error data
    const characterErrors: Record<string, number> = {};
    const wordErrors: Record<string, number> = {};
    const allPatterns: Array<{
      pattern: string;
      frequency: number;
      context: string;
      suggestions: string[];
    }> = [];

    errorData.forEach((error) => {
      // Parse JSON data
      const charErrors = JSON.parse(error.characterErrors);
      const wErrors = JSON.parse(error.wordErrors);
      const patterns = JSON.parse(error.errorPatterns);

      // Aggregate character errors
      Object.entries(charErrors).forEach(([char, count]) => {
        characterErrors[char] =
          (characterErrors[char] || 0) + (count as number);
      });

      // Aggregate word errors
      Object.entries(wErrors).forEach(([word, count]) => {
        wordErrors[word] = (wordErrors[word] || 0) + (count as number);
      });

      // Collect patterns
      allPatterns.push(...patterns);
    });

    // Get most problematic characters and words
    const mostProblematicChars = Object.entries(characterErrors)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([character, errorCount]) => ({
        character,
        errorCount,
        errorRate: 0, // Would need total character count to calculate
        suggestions: [
          `Practice typing "${character}" slowly`,
          'Focus on finger placement',
        ],
      }));

    const mostProblematicWords = Object.entries(wordErrors)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word, errorCount]) => ({
        word,
        errorCount,
        errorRate: 0, // Would need total word count to calculate
        commonMistakes: [], // Would need detailed analysis
      }));

    // Aggregate and sort patterns
    const patternMap = new Map();
    allPatterns.forEach((pattern) => {
      const key = pattern.pattern;
      if (patternMap.has(key)) {
        patternMap.get(key).frequency += pattern.frequency;
      } else {
        patternMap.set(key, { ...pattern });
      }
    });

    const commonPatterns = Array.from(patternMap.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    const errorAnalysis = {
      mostProblematicChars,
      mostProblematicWords,
      commonPatterns,
      improvementAreas: mostProblematicChars
        .slice(0, 3)
        .map((char) => `Improve accuracy for "${char.character}"`),
    };

    return c.json({ errorAnalysis });
  } catch (error) {
    console.error('Error fetching error analysis:', error);
    return c.json({ error: 'Failed to fetch error analysis' }, 500);
  }
});

// Get keystroke analytics
analytics.get('/keystrokes/:testResultId', async (c) => {
  try {
    const payload = c.get('jwtPayload') as JWTPayload;
    const userId = payload.userId;
    const testResultId = c.req.param('testResultId');

    const keystrokeData = await db
      .select()
      .from(keystrokeAnalytics)
      .where(
        and(
          eq(keystrokeAnalytics.completedTestId, testResultId),
          eq(keystrokeAnalytics.userId, userId)
        )
      )
      .limit(1);

    if (keystrokeData.length === 0) {
      return c.json({ error: 'Keystroke data not found' }, 404);
    }

    const data = keystrokeData[0];
    if (!data) {
      return c.json({ error: 'Keystroke data not found' }, 404);
    }

    const keystrokeEvents = JSON.parse(data.keystrokeData);

    return c.json({
      keystrokeAnalytics: {
        ...data,
        keystrokeData: keystrokeEvents,
      },
    });
  } catch (error) {
    console.error('Error fetching keystroke analytics:', error);
    return c.json({ error: 'Failed to fetch keystroke analytics' }, 500);
  }
});

// Get user goals
analytics.get('/goals', async (c) => {
  try {
    const payload = c.get('jwtPayload') as JWTPayload;
    const userId = payload.userId;

    const goals = await db
      .select()
      .from(userGoals)
      .where(eq(userGoals.userId, userId))
      .orderBy(desc(userGoals.createdAt));

    return c.json({ goals });
  } catch (error) {
    console.error('Error fetching user goals:', error);
    return c.json({ error: 'Failed to fetch user goals' }, 500);
  }
});

// Create a new goal
analytics.post('/goals', async (c) => {
  try {
    const payload = c.get('jwtPayload') as JWTPayload;
    const userId = payload.userId;
    const { goalType, targetValue, targetDate } = await c.req.json();

    const newGoal = await db
      .insert(userGoals)
      .values({
        userId,
        goalType,
        targetValue: targetValue.toString(),
        targetDate: targetDate ? new Date(targetDate) : null,
      })
      .returning();

    return c.json({ goal: newGoal[0] });
  } catch (error) {
    console.error('Error creating goal:', error);
    return c.json({ error: 'Failed to create goal' }, 500);
  }
});

// Get recommendations
analytics.get('/recommendations', async (c) => {
  try {
    const payload = c.get('jwtPayload') as JWTPayload;
    const userId = payload.userId;

    const recommendations = await db
      .select()
      .from(userRecommendations)
      .where(eq(userRecommendations.userId, userId))
      .orderBy(
        desc(userRecommendations.priority),
        desc(userRecommendations.createdAt)
      )
      .limit(10);

    return c.json({ recommendations });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return c.json({ error: 'Failed to fetch recommendations' }, 500);
  }
});

// Process test result for analytics (called after test submission)
analytics.post('/process-result/:testResultId', async (c) => {
  try {
    const payload = c.get('jwtPayload') as JWTPayload;
    const userId = payload.userId;
    const testResultId = c.req.param('testResultId');

    // Get the completed test with keystroke data
    const result = await db
      .select()
      .from(completedTests)
      .where(
        and(
          eq(completedTests.id, testResultId),
          eq(completedTests.userId, userId)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return c.json({ error: 'Test result not found' }, 404);
    }

    const completedTest = result[0];
    if (!completedTest) {
      return c.json({ error: 'Completed test not found' }, 404);
    }

    if (!completedTest.keystrokeData) {
      return c.json({ error: 'No keystroke data available' }, 400);
    }

    // Parse keystroke data
    const keystrokeEvents = JSON.parse(completedTest.keystrokeData);

    // Calculate basic analytics from keystroke data
    let averageKeystrokeTime = 200; // Default fallback
    let keystrokeVariance = 50;
    let typingRhythm = 75;

    if (keystrokeEvents.length > 1) {
      const times: number[] = [];
      for (let i = 1; i < keystrokeEvents.length; i++) {
        const timeDiff =
          keystrokeEvents[i].timestamp - keystrokeEvents[i - 1].timestamp;
        times.push(timeDiff);
      }

      if (times.length > 0) {
        averageKeystrokeTime =
          times.reduce((sum, time) => sum + time, 0) / times.length;
        const mean = averageKeystrokeTime;
        keystrokeVariance =
          times.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) /
          times.length;

        // Calculate consistency score (typing rhythm)
        const standardDeviation = Math.sqrt(keystrokeVariance);
        const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 1;
        typingRhythm = Math.max(0, 100 - coefficientOfVariation * 100);
      }
    }

    // Analyze errors
    const characterErrors: Record<string, number> = {};
    const mostProblematicChars: string[] = [];

    keystrokeEvents.forEach((event: any) => {
      if (!event.correct && event.expectedChar) {
        characterErrors[event.expectedChar] =
          (characterErrors[event.expectedChar] || 0) + 1;
      }
    });

    // Get most problematic characters
    Object.entries(characterErrors)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([char]) => mostProblematicChars.push(char));

    // Create keystroke analytics
    await db.insert(keystrokeAnalytics).values({
      completedTestId: testResultId,
      userId,
      keystrokeData: completedTest.keystrokeData,
      averageKeystrokeTime: averageKeystrokeTime.toString(),
      keystrokeVariance: keystrokeVariance.toString(),
      typingRhythm: typingRhythm.toString(),
    });

    // Create error analytics
    await db.insert(errorAnalytics).values({
      completedTestId: testResultId,
      userId,
      characterErrors: JSON.stringify(characterErrors),
      wordErrors: JSON.stringify({}),
      errorPatterns: JSON.stringify([]),
      mostProblematicChars: JSON.stringify(mostProblematicChars),
    });

    // Generate performance insights for this test
    const currentDate = new Date();

    // Check if we already have insights for today
    const existingInsight = await db
      .select()
      .from(performanceInsights)
      .where(
        and(
          eq(performanceInsights.userId, userId),
          eq(performanceInsights.date, currentDate),
          eq(performanceInsights.timeframe, 'daily')
        )
      )
      .limit(1);

    if (existingInsight.length === 0) {
      // Create new daily insight
      await db.insert(performanceInsights).values({
        userId,
        date: currentDate,
        timeframe: 'daily',
        avgWpm: completedTest.wpm,
        avgAccuracy: completedTest.accuracy,
        testCount: 1,
        consistencyScore: typingRhythm.toString(),
      });
    } else {
      // Update existing insight with new averages
      const insight = existingInsight[0];
      if (
        insight &&
        insight.testCount !== null &&
        insight.avgWpm &&
        insight.avgAccuracy
      ) {
        const testCount = insight.testCount + 1;
        const newAvgWpm =
          (parseFloat(insight.avgWpm) * (testCount - 1) +
            parseFloat(completedTest.wpm)) /
          testCount;
        const newAvgAccuracy =
          (parseFloat(insight.avgAccuracy) * (testCount - 1) +
            parseFloat(completedTest.accuracy)) /
          testCount;

        await db
          .update(performanceInsights)
          .set({
            avgWpm: newAvgWpm.toString(),
            avgAccuracy: newAvgAccuracy.toString(),
            testCount: testCount,
            consistencyScore: typingRhythm.toString(),
          })
          .where(eq(performanceInsights.id, insight.id));
      }
    }

    return c.json({ message: 'Analytics processed successfully' });
  } catch (error) {
    console.error('Error processing analytics:', error);
    return c.json({ error: 'Failed to process analytics' }, 500);
  }
});

export default analytics;
