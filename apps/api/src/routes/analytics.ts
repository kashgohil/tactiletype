import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { db } from '@tactile/database';
import {
  testResults,
  keystrokeAnalytics,
  errorAnalytics,
  performanceInsights,
  userGoals,
  userRecommendations,
  practiceSessions
} from '@tactile/database/src/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import type { JWTPayload } from '@tactile/types';

const analytics = new Hono();

// JWT middleware for protected routes
analytics.use('/*', jwt({
  secret: process.env.JWT_SECRET || 'your-secret-key',
}));

// Get user analytics overview
analytics.get('/overview', async (c) => {
  try {
    const payload = c.get('jwtPayload') as JWTPayload;
    const userId = payload.userId;

    // Get basic stats
    const userResults = await db
      .select({
        totalTests: sql<number>`count(*)`,
        avgWpm: sql<number>`avg(${testResults.wpm})`,
        bestWpm: sql<number>`max(${testResults.wpm})`,
        avgAccuracy: sql<number>`avg(${testResults.accuracy})`,
        bestAccuracy: sql<number>`max(${testResults.accuracy})`,
        totalTimeSpent: sql<number>`sum(${testResults.timeTaken})`,
      })
      .from(testResults)
      .where(eq(testResults.userId, userId));

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
        improvementRate = ((Number(recent.avgWpm) - Number(older.avgWpm)) / Number(older.avgWpm)) * 100;
      }
      
      consistencyScore = recentInsights.reduce((sum, insight) =>
        sum + Number(insight.consistencyScore || 0), 0) / recentInsights.length;
    }

    const overview = {
      totalTests: Number(userResults[0]?.totalTests || 0),
      totalTimeSpent: Number(userResults[0]?.totalTimeSpent || 0),
      averageWpm: Math.round(Number(userResults[0]?.avgWpm || 0) * 100) / 100,
      bestWpm: Math.round(Number(userResults[0]?.bestWpm || 0) * 100) / 100,
      averageAccuracy: Math.round(Number(userResults[0]?.avgAccuracy || 0) * 100) / 100,
      bestAccuracy: Math.round(Number(userResults[0]?.bestAccuracy || 0) * 100) / 100,
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
      .where(and(
        eq(performanceInsights.userId, userId),
        eq(performanceInsights.timeframe, timeframe)
      ))
      .orderBy(desc(performanceInsights.date))
      .limit(limit);

    // Transform data for charts
    const wpmData = insights.map(insight => ({
      date: insight.date.toISOString().split('T')[0],
      value: Number(insight.avgWpm || 0),
    })).reverse();

    const accuracyData = insights.map(insight => ({
      date: insight.date.toISOString().split('T')[0],
      value: Number(insight.avgAccuracy || 0),
    })).reverse();

    const consistencyData = insights.map(insight => ({
      date: insight.date.toISOString().split('T')[0],
      value: Number(insight.consistencyScore || 0),
    })).reverse();

    // Calculate trends
    const calculateTrend = (data: Array<{ value: number }>) => {
      if (data.length < 2) return { trend: 'stable', percentage: 0 };
      
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
      
      return { trend, percentage: Math.round(percentage * 100) / 100 };
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
    const allPatterns: Array<{ pattern: string; frequency: number; context: string; suggestions: string[] }> = [];

    errorData.forEach(error => {
      // Parse JSON data
      const charErrors = JSON.parse(error.characterErrors);
      const wErrors = JSON.parse(error.wordErrors);
      const patterns = JSON.parse(error.errorPatterns);

      // Aggregate character errors
      Object.entries(charErrors).forEach(([char, count]) => {
        characterErrors[char] = (characterErrors[char] || 0) + (count as number);
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
        suggestions: [`Practice typing "${character}" slowly`, 'Focus on finger placement'],
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
    allPatterns.forEach(pattern => {
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
      improvementAreas: mostProblematicChars.slice(0, 3).map(char => `Improve accuracy for "${char.character}"`),
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
      .where(and(
        eq(keystrokeAnalytics.testResultId, testResultId),
        eq(keystrokeAnalytics.userId, userId)
      ))
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
      .orderBy(desc(userRecommendations.priority), desc(userRecommendations.createdAt))
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

    // Get the test result with keystroke data
    const result = await db
      .select()
      .from(testResults)
      .where(and(
        eq(testResults.id, testResultId),
        eq(testResults.userId, userId)
      ))
      .limit(1);

    if (result.length === 0) {
      return c.json({ error: 'Test result not found' }, 404);
    }

    const testResult = result[0];
    if (!testResult) {
      return c.json({ error: 'Test result not found' }, 404);
    }
    
    if (!testResult.keystrokeData) {
      return c.json({ error: 'No keystroke data available' }, 400);
    }

    // Parse keystroke data
    const keystrokeEvents = JSON.parse(testResult.keystrokeData);
    
    // TODO: Use AnalyticsEngine to process the data
    // For now, we'll create basic analytics entries
    
    // Create keystroke analytics
    await db.insert(keystrokeAnalytics).values({
      testResultId,
      userId,
      keystrokeData: testResult.keystrokeData,
      averageKeystrokeTime: '200', // Placeholder - would calculate from actual data
      keystrokeVariance: '50', // Placeholder
      typingRhythm: '75', // Placeholder
    });

    // Create error analytics
    await db.insert(errorAnalytics).values({
      testResultId,
      userId,
      characterErrors: JSON.stringify({}), // Placeholder
      wordErrors: JSON.stringify({}), // Placeholder
      errorPatterns: JSON.stringify([]), // Placeholder
      mostProblematicChars: JSON.stringify([]), // Placeholder
    });

    return c.json({ message: 'Analytics processed successfully' });
  } catch (error) {
    console.error('Error processing analytics:', error);
    return c.json({ error: 'Failed to process analytics' }, 500);
  }
});

export default analytics;