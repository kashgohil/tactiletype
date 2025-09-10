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
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { JWT_SECRET } from '../constants';
import { AnalyticsEngine } from '../utils/analyticsEngine';

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

    // Get all user's tests for stats calculation
    const allUserTests = await db.query.completedTests.findMany({
      where: eq(completedTests.userId, userId),
      columns: {
        wpm: true,
        accuracy: true,
        timeTaken: true,
        completedAt: true,
      },
    });

    // Calculate basic stats using utility function
    const basicStats = AnalyticsEngine.calculateUserStats(allUserTests);

    // Get recent performance insights for improvement rate and consistency
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
      totalTests: basicStats.totalTests,
      totalTimeSpent: basicStats.totalTime,
      averageWpm: basicStats.avgWpm,
      bestWpm: basicStats.bestWpm,
      averageAccuracy: basicStats.avgAccuracy,
      bestAccuracy: basicStats.bestAccuracy,
      improvementRate: Math.round(improvementRate * 100) / 100,
      consistencyScore: Math.round(consistencyScore * 100) / 100,
      currentStreak: basicStats.currentStreak,
      longestStreak: basicStats.longestStreak,
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

    let insights;

    if (timeframe === 'daily') {
      // Query existing daily insights
      insights = await db
        .select()
        .from(performanceInsights)
        .where(
          and(
            eq(performanceInsights.userId, userId),
            eq(performanceInsights.timeframe, 'daily')
          )
        )
        .orderBy(desc(performanceInsights.date))
        .limit(limit);
    } else {
      // First, get the raw daily data
      const dailyData = await db
        .select()
        .from(performanceInsights)
        .where(
          and(
            eq(performanceInsights.userId, userId),
            eq(performanceInsights.timeframe, 'daily')
          )
        )
        .orderBy(desc(performanceInsights.date))
        .limit(limit * 7); // Get more data to aggregate

      // Aggregate in JavaScript to avoid PostgreSQL grouping issues
      const aggregatedData: Record<string, any> = {};

      dailyData.forEach((record) => {
        const date = new Date(record.date);
        const periodKey =
          timeframe === 'weekly'
            ? `${date.getFullYear()}-W${Math.ceil((date.getDate() - date.getDay() + 1) / 7)}`
            : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!aggregatedData[periodKey]) {
          aggregatedData[periodKey] = {
            date: record.date,
            avgWpm: [],
            avgAccuracy: [],
            consistencyScore: [],
            testCount: 0,
            totalTimeSpent: 0,
            count: 0,
          };
        }

        if (record.avgWpm !== null)
          aggregatedData[periodKey].avgWpm.push(Number(record.avgWpm));
        if (record.avgAccuracy !== null)
          aggregatedData[periodKey].avgAccuracy.push(
            Number(record.avgAccuracy)
          );
        if (record.consistencyScore !== null)
          aggregatedData[periodKey].consistencyScore.push(
            Number(record.consistencyScore)
          );
        aggregatedData[periodKey].testCount += Number(record.testCount || 0);
        aggregatedData[periodKey].totalTimeSpent += Number(
          record.totalTimeSpent || 0
        );
        aggregatedData[periodKey].count += 1;
      });

      // Convert to final format
      const aggregatedResults = Object.values(aggregatedData)
        .map((group: any) => ({
          date: group.date,
          avgWpm:
            group.avgWpm.length > 0
              ? group.avgWpm.reduce((a: number, b: number) => a + b, 0) /
                group.avgWpm.length
              : 0,
          avgAccuracy:
            group.avgAccuracy.length > 0
              ? group.avgAccuracy.reduce((a: number, b: number) => a + b, 0) /
                group.avgAccuracy.length
              : 0,
          consistencyScore:
            group.consistencyScore.length > 0
              ? group.consistencyScore.reduce(
                  (a: number, b: number) => a + b,
                  0
                ) / group.consistencyScore.length
              : 0,
          testCount: group.testCount,
          totalTimeSpent: group.totalTimeSpent,
        }))
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

      // Ensure current month is included even if no data
      const now = new Date();
      const currentPeriodKey =
        timeframe === 'weekly'
          ? `${now.getFullYear()}-W${Math.ceil((now.getDate() - now.getDay() + 1) / 7)}`
          : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const hasCurrentPeriod = aggregatedResults.some((result) => {
        const resultDate = new Date(result.date);
        const resultPeriodKey =
          timeframe === 'weekly'
            ? `${resultDate.getFullYear()}-W${Math.ceil((resultDate.getDate() - resultDate.getDay() + 1) / 7)}`
            : `${resultDate.getFullYear()}-${String(resultDate.getMonth() + 1).padStart(2, '0')}`;
        return resultPeriodKey === currentPeriodKey;
      });

      if (!hasCurrentPeriod) {
        aggregatedResults.unshift({
          date: now,
          avgWpm: 0,
          avgAccuracy: 0,
          consistencyScore: 0,
          testCount: 0,
          totalTimeSpent: 0,
        });
      }

      insights = aggregatedResults.slice(0, limit);
    }

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

    // Get keystroke data to calculate total character counts
    const keystrokeData = await db
      .select({
        keystrokeData: completedTests.keystrokeData,
      })
      .from(completedTests)
      .where(eq(completedTests.userId, userId));

    // Count total keystrokes per character from keystroke data
    const totalKeystrokes: Record<string, number> = {};
    keystrokeData.forEach((test) => {
      if (test.keystrokeData) {
        try {
          const keystrokes = JSON.parse(test.keystrokeData);
          keystrokes.forEach((keystroke: any) => {
            if (keystroke.expectedChar && keystroke.expectedChar.length === 1) {
              totalKeystrokes[keystroke.expectedChar] =
                (totalKeystrokes[keystroke.expectedChar] || 0) + 1;
            }
          });
        } catch (e) {
          // Skip malformed keystroke data
          console.warn('Skipping malformed keystroke data');
        }
      }
    });

    // Get most problematic characters and words
    const mostProblematicChars = Object.entries(characterErrors)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([character, errorCount]) => {
        const total = totalKeystrokes[character] || 0;
        const errorRate = total > 0 ? (errorCount / total) * 100 : 0;

        return {
          character,
          errorCount,
          errorRate: Math.round(errorRate * 100) / 100, // Round to 2 decimal places
          suggestions: [
            `Practice typing "${character}" slowly`,
            'Focus on finger placement',
          ],
        };
      });

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

    // Calculate current values for each goal based on user's actual performance
    const updatedGoals = await Promise.all(
      goals.map(async (goal) => {
        let currentValue = 0;

        switch (goal.goalType) {
          case 'wpm':
            // Get user's best WPM using AnalyticsEngine
            const userTestsForWpm = await db.query.completedTests.findMany({
              where: eq(completedTests.userId, userId),
              columns: {
                wpm: true,
                accuracy: true,
                timeTaken: true,
                completedAt: true,
              },
            });
            const wpmStats =
              AnalyticsEngine.calculateUserStats(userTestsForWpm);
            currentValue = wpmStats.bestWpm;
            break;

          case 'accuracy':
            // Get user's best accuracy using AnalyticsEngine
            const userTestsForAccuracy = await db.query.completedTests.findMany(
              {
                where: eq(completedTests.userId, userId),
                columns: {
                  wpm: true,
                  accuracy: true,
                  timeTaken: true,
                  completedAt: true,
                },
              }
            );
            const accuracyStats =
              AnalyticsEngine.calculateUserStats(userTestsForAccuracy);
            currentValue = accuracyStats.bestAccuracy;
            break;

          case 'consistency':
            // Get user's latest consistency score from performance insights
            const consistencyResult = await db
              .select({
                consistencyScore: performanceInsights.consistencyScore,
              })
              .from(performanceInsights)
              .where(eq(performanceInsights.userId, userId))
              .orderBy(desc(performanceInsights.date))
              .limit(1);
            currentValue = Number(consistencyResult[0]?.consistencyScore || 0);
            break;

          case 'daily_tests':
            // Count tests completed today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const dailyTestsResult = await db
              .select({ count: sql<number>`count(*)` })
              .from(completedTests)
              .where(
                and(
                  eq(completedTests.userId, userId),
                  gte(completedTests.completedAt, today),
                  lt(completedTests.completedAt, tomorrow)
                )
              );
            currentValue = Number(dailyTestsResult[0]?.count || 0);
            break;
        }

        // Update the goal's current value in the database
        await db
          .update(userGoals)
          .set({
            currentValue: currentValue.toString(),
            updatedAt: new Date(),
          })
          .where(eq(userGoals.id, goal.id));

        return {
          ...goal,
          currentValue: currentValue.toString(),
        };
      })
    );

    return c.json({ goals: updatedGoals });
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

// Get daily activity data for heatmap
analytics.get('/activity-heatmap', async (c) => {
  try {
    const payload = c.get('jwtPayload') as JWTPayload;
    const userId = payload.userId;
    const year = c.req.query('year')
      ? parseInt(c.req.query('year')!)
      : new Date().getFullYear();

    // Calculate date range for the specified year (handle timezone properly)
    const startDate = new Date(year, 0, 1, 0, 0, 0, 0); // January 1st of the year, start of day
    const endDate = new Date(year + 1, 0, 1, 0, 0, 0, 0); // January 1st of next year, start of day

    // Get daily test counts directly from completed tests (source of truth)
    const testData = await db
      .select({
        date: sql<string>`DATE(${completedTests.completedAt})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(completedTests)
      .where(
        and(
          eq(completedTests.userId, userId),
          gte(completedTests.completedAt, startDate),
          lt(completedTests.completedAt, endDate)
        )
      )
      .groupBy(sql`DATE(${completedTests.completedAt})`)
      .orderBy(sql`DATE(${completedTests.completedAt})`);

    const activityData = testData.map((item) => ({
      date: item.date,
      count: item.count,
    }));

    // Get total test count for the year (separate query to ensure accuracy)
    const totalTestsResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(completedTests)
      .where(
        and(
          eq(completedTests.userId, userId),
          gte(completedTests.completedAt, startDate),
          lt(completedTests.completedAt, endDate)
        )
      );

    const totalTests = Number(totalTestsResult[0]?.count || 0);
    const maxCount = Math.max(...activityData.map((day) => day.count), 0);
    const activeDays = activityData.filter((day) => day.count > 0).length;

    return c.json({
      activity: {
        data: activityData,
        totalTests,
        maxCount,
        activeDays,
        year,
      },
    });
  } catch (error) {
    console.error('Error fetching activity heatmap:', error);
    return c.json({ error: 'Failed to fetch activity heatmap' }, 500);
  }
});

// Get accuracy heatmap data
analytics.get('/accuracy-heatmap', async (c) => {
  try {
    const payload = c.get('jwtPayload') as JWTPayload;
    const userId = payload.userId;
    const timeframe = c.req.query('timeframe') || 'all';

    // Calculate date filter based on timeframe
    let dateFilter;
    const now = new Date();

    switch (timeframe) {
      case 'week':
        // Start of current week (Sunday)
        dateFilter = new Date(now);
        dateFilter.setDate(now.getDate() - now.getDay());
        dateFilter.setHours(0, 0, 0, 0);
        break;
      case 'month':
        // Start of current month
        dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all':
      default:
        dateFilter = null; // No date filter
        break;
    }

    // Build where conditions - use completedAt for consistency
    const whereConditions = [eq(completedTests.userId, userId)];
    if (dateFilter) {
      whereConditions.push(gte(completedTests.completedAt, dateFilter));
    }

    // Get test data with both error analytics and keystroke data
    const testData = await db
      .select({
        completedTestId: completedTests.id,
        keystrokeData: completedTests.keystrokeData,
        completedAt: completedTests.completedAt,
        errorData: errorAnalytics.characterErrors,
      })
      .from(completedTests)
      .leftJoin(
        errorAnalytics,
        and(
          eq(errorAnalytics.completedTestId, completedTests.id),
          eq(errorAnalytics.userId, userId)
        )
      )
      .where(and(...whereConditions))
      .orderBy(desc(completedTests.completedAt))
      .limit(timeframe === 'all' ? 200 : 100); // Get more data for calculations

    // Aggregate character errors and calculate accuracy
    const characterStats: Record<string, { errors: number; total: number }> =
      {};

    // Process each test's data
    testData.forEach((test) => {
      // Count total keystrokes per character from keystroke data
      if (test.keystrokeData) {
        try {
          const keystrokes = JSON.parse(test.keystrokeData);
          keystrokes.forEach((keystroke: any) => {
            if (keystroke.expectedChar && keystroke.expectedChar.length === 1) {
              if (!characterStats[keystroke.expectedChar]) {
                characterStats[keystroke.expectedChar] = {
                  errors: 0,
                  total: 0,
                };
              }
              characterStats[keystroke.expectedChar]!.total += 1;
            }
          });
        } catch (e) {
          // Skip malformed keystroke data
          console.warn('Skipping malformed keystroke data in heatmap');
        }
      }

      // Count character errors from error analytics
      if (test.errorData) {
        try {
          const charErrors = JSON.parse(test.errorData);
          Object.entries(charErrors).forEach(([char, count]) => {
            if (!characterStats[char]) {
              characterStats[char] = { errors: 0, total: 0 };
            }
            characterStats[char].errors += count as number;
          });
        } catch (e) {
          // Skip malformed error data
          console.warn('Skipping malformed error data in heatmap');
        }
      }
    });

    // Calculate accuracy for each character
    const characters = Object.entries(characterStats).map(
      ([character, stats]) => {
        const accuracy =
          stats.total > 0
            ? Math.max(0, ((stats.total - stats.errors) / stats.total) * 100)
            : 100; // If no keystrokes recorded but character exists, assume 100% accuracy

        // Use actual frequency from keystroke data
        const frequency = stats.total;

        // Determine color based on accuracy
        let color = '#22c55e'; // Green for good accuracy
        if (accuracy < 85) color = '#fbbf24'; // Yellow for medium
        if (accuracy < 70) color = '#f97316'; // Orange for poor
        if (accuracy < 50) color = '#ef4444'; // Red for very poor

        return {
          character,
          accuracy: Math.round(accuracy * 10) / 10,
          frequency,
          color,
        };
      }
    );

    // Sort by frequency (most used first), then by accuracy (worst first for same frequency)
    characters.sort((a, b) => {
      if (b.frequency !== a.frequency) {
        return b.frequency - a.frequency;
      }
      return a.accuracy - b.accuracy; // Show worse accuracy first for same frequency
    });

    const maxValue = Math.max(...characters.map((c) => c.accuracy));
    const minValue = Math.min(...characters.map((c) => c.accuracy));

    return c.json({
      heatmap: {
        characters,
        maxValue,
        minValue,
      },
    });
  } catch (error) {
    console.error('Error fetching accuracy heatmap:', error);
    return c.json({ error: 'Failed to fetch accuracy heatmap' }, 500);
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

// Mark recommendation as read
analytics.patch('/recommendations/:recommendationId/read', async (c) => {
  try {
    const payload = c.get('jwtPayload') as JWTPayload;
    const userId = payload.userId;
    const recommendationId = c.req.param('recommendationId');

    await db
      .update(userRecommendations)
      .set({ isRead: true })
      .where(
        and(
          eq(userRecommendations.id, recommendationId),
          eq(userRecommendations.userId, userId)
        )
      );

    return c.json({ message: 'Recommendation marked as read' });
  } catch (error) {
    console.error('Error marking recommendation as read:', error);
    return c.json({ error: 'Failed to mark recommendation as read' }, 500);
  }
});

// Mark recommendation as applied
analytics.patch('/recommendations/:recommendationId/applied', async (c) => {
  try {
    const payload = c.get('jwtPayload') as JWTPayload;
    const userId = payload.userId;
    const recommendationId = c.req.param('recommendationId');

    await db
      .update(userRecommendations)
      .set({ isApplied: true })
      .where(
        and(
          eq(userRecommendations.id, recommendationId),
          eq(userRecommendations.userId, userId)
        )
      );

    return c.json({ message: 'Recommendation marked as applied' });
  } catch (error) {
    console.error('Error marking recommendation as applied:', error);
    return c.json({ error: 'Failed to mark recommendation as applied' }, 500);
  }
});

// Delete goal
analytics.delete('/goals/:goalId', async (c) => {
  try {
    const payload = c.get('jwtPayload') as JWTPayload;
    const userId = payload.userId;
    const goalId = c.req.param('goalId');

    await db
      .delete(userGoals)
      .where(and(eq(userGoals.id, goalId), eq(userGoals.userId, userId)));

    return c.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return c.json({ error: 'Failed to delete goal' }, 500);
  }
});

// Export analytics data
analytics.get('/export', async (c) => {
  try {
    const payload = c.get('jwtPayload') as JWTPayload;
    const userId = payload.userId;
    const format = c.req.query('format') || 'json';

    // Get user's test data
    const testData = await db
      .select()
      .from(completedTests)
      .where(eq(completedTests.userId, userId))
      .orderBy(desc(completedTests.completedAt));

    if (format === 'csv') {
      // Create CSV content
      const csvHeaders = 'Date,WPM,Accuracy,Errors,Time Taken,Difficulty\n';
      const csvRows = testData
        .map(
          (test) =>
            `${test.completedAt.toISOString().split('T')[0]},${test.wpm},${test.accuracy},${test.errors},${test.timeTaken},${test.difficulty}`
        )
        .join('\n');

      const csvContent = csvHeaders + csvRows;

      c.header('Content-Type', 'text/csv');
      c.header(
        'Content-Disposition',
        'attachment; filename="typing-analytics.csv"'
      );
      return c.body(csvContent);
    } else {
      // Return JSON
      const jsonData = testData.map((test) => ({
        date: test.completedAt.toISOString().split('T')[0],
        wpm: parseFloat(test.wpm),
        accuracy: parseFloat(test.accuracy),
        errors: test.errors,
        timeTaken: test.timeTaken,
        difficulty: test.difficulty,
        title: test.title,
      }));

      c.header('Content-Type', 'application/json');
      c.header(
        'Content-Disposition',
        'attachment; filename="typing-analytics.json"'
      );
      return c.json({ analytics: jsonData });
    }
  } catch (error) {
    console.error('Error exporting analytics data:', error);
    return c.json({ error: 'Failed to export analytics data' }, 500);
  }
});

export default analytics;
