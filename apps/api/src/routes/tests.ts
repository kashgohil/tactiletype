import { zValidator } from '@hono/zod-validator';
import { completedTests, db, testTexts, users } from '@tactile/database';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { optionalAuthMiddleware } from '../middleware/optionalAuth';

type Variables = {
  user: {
    userId: string;
    email: string;
    username: string;
  };
};

const testRoutes = new Hono<{ Variables: Variables }>();

// Test text creation schema
const createTestTextSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  language: z.string().min(1).max(10),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  wordCount: z.number().min(1),
});

// Test result submission schema
const submitResultSchema = z.object({
  // Test text data
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  language: z.string().min(1).max(10),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  wordCount: z.number().min(1),
  // Test results data
  wpm: z.number().min(0).max(500),
  accuracy: z.number().min(0).max(100),
  errors: z.number().min(0),
  timeTaken: z.number().min(1),
  keystrokeData: z.string().optional(),
});

// Get available test texts
testRoutes.get('/texts', optionalAuthMiddleware, async (c) => {
  try {
    const language = c.req.query('language') || 'en';
    const difficulty = c.req.query('difficulty');
    const limit = parseInt(c.req.query('limit') || '20');

    let whereConditions = [eq(testTexts.isActive, true)];

    if (language) {
      whereConditions.push(eq(testTexts.language, language));
    }

    if (difficulty) {
      whereConditions.push(eq(testTexts.difficulty, difficulty));
    }

    const texts = await db.query.testTexts.findMany({
      where: and(...whereConditions),
      limit,
      orderBy: desc(testTexts.createdAt),
      columns: {
        id: true,
        title: true,
        content: true,
        language: true,
        difficulty: true,
        wordCount: true,
        createdAt: true,
      },
    });

    return c.json({ texts });
  } catch (error) {
    console.error('Get texts error:', error);
    return c.json({ error: 'Failed to get test texts' }, 500);
  }
});

// Get specific test text
testRoutes.get('/texts/:id', optionalAuthMiddleware, async (c) => {
  try {
    const textId = c.req.param('id');

    const text = await db.query.testTexts.findFirst({
      where: and(eq(testTexts.id, textId), eq(testTexts.isActive, true)),
      columns: {
        id: true,
        title: true,
        content: true,
        language: true,
        difficulty: true,
        wordCount: true,
        createdAt: true,
      },
    });

    if (!text) {
      return c.json({ error: 'Test text not found' }, 404);
    }

    return c.json({ text });
  } catch (error) {
    console.error('Get text error:', error);
    return c.json({ error: 'Failed to get test text' }, 500);
  }
});

// Create new test text
testRoutes.post(
  '/texts',
  authMiddleware,
  zValidator('json', createTestTextSchema),
  async (c) => {
    try {
      const user = c.get('user') as any;
      const testTextData = c.req.valid('json');

      // Insert new test text
      const [newTestText] = await db
        .insert(testTexts)
        .values({
          title: testTextData.title,
          content: testTextData.content,
          language: testTextData.language,
          difficulty: testTextData.difficulty,
          wordCount: testTextData.wordCount,
          isActive: true,
        })
        .returning();

      if (!newTestText) {
        return c.json({ error: 'Failed to create test text' }, 500);
      }

      return c.json({
        message: 'Test text created successfully',
        text: {
          id: newTestText.id,
          title: newTestText.title,
          content: newTestText.content,
          language: newTestText.language,
          difficulty: newTestText.difficulty,
          wordCount: newTestText.wordCount,
          createdAt: newTestText.createdAt,
        },
      });
    } catch (error) {
      console.error('Create test text error:', error);
      return c.json({ error: 'Failed to create test text' }, 500);
    }
  }
);

// Submit test result
testRoutes.post(
  '/results',
  authMiddleware,
  zValidator('json', submitResultSchema),
  async (c) => {
    try {
      const user = c.get('user') as any;
      const resultData = c.req.valid('json');

      // Insert completed test with embedded test text data
      const [result] = await db
        .insert(completedTests)
        .values({
          userId: user.userId,
          // Test text data
          title: resultData.title,
          content: resultData.content,
          language: resultData.language,
          difficulty: resultData.difficulty,
          wordCount: resultData.wordCount,
          // Test results data
          wpm: resultData.wpm.toString(),
          accuracy: resultData.accuracy.toString(),
          errors: resultData.errors,
          timeTaken: resultData.timeTaken,
          keystrokeData: resultData.keystrokeData,
        })
        .returning();

      if (!result) {
        return c.json({ error: 'Failed to save test result' }, 500);
      }

      return c.json({
        message: 'Test result submitted successfully',
        result: {
          id: result.id,
          wpm: parseFloat(result.wpm),
          accuracy: parseFloat(result.accuracy),
          errors: result.errors,
          timeTaken: result.timeTaken,
          completedAt: result.completedAt,
        },
      });
    } catch (error) {
      console.error('Submit result error:', error);
      return c.json({ error: 'Failed to submit test result' }, 500);
    }
  }
);

// Get leaderboard
testRoutes.get('/leaderboard', async (c) => {
  try {
    const timeframe = c.req.query('timeframe') || 'all'; // daily, weekly, monthly, all
    const limit = parseInt(c.req.query('limit') || '100');

    let timeFilter;
    switch (timeframe) {
      case 'daily':
        timeFilter = gte(
          completedTests.completedAt,
          sql`now() - interval '1 day'`
        );
        break;
      case 'weekly':
        timeFilter = gte(
          completedTests.completedAt,
          sql`now() - interval '1 week'`
        );
        break;
      case 'monthly':
        timeFilter = gte(
          completedTests.completedAt,
          sql`now() - interval '1 month'`
        );
        break;
      default:
        timeFilter = undefined;
    }

    const leaderboard = await db
      .select({
        userId: completedTests.userId,
        username: users.username,
        bestWpm: sql<number>`max(${completedTests.wpm})`,
        avgWpm: sql<number>`avg(${completedTests.wpm})`,
        avgAccuracy: sql<number>`avg(${completedTests.accuracy})`,
        testCount: sql<number>`count(*)`,
      })
      .from(completedTests)
      .innerJoin(users, eq(completedTests.userId, users.id))
      .where(timeFilter)
      .groupBy(completedTests.userId, users.username)
      .orderBy(desc(sql`max(${completedTests.wpm})`))
      .limit(limit);

    return c.json({ leaderboard });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return c.json({ error: 'Failed to get leaderboard' }, 500);
  }
});

// Get user's test results
testRoutes.get('/results', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as any;
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    const results = await db.query.completedTests.findMany({
      where: eq(completedTests.userId, user.userId),
      orderBy: desc(completedTests.completedAt),
      limit,
      offset,
    });

    const formattedResults = results.map((result) => ({
      id: result.id,
      wpm: parseFloat(result.wpm),
      accuracy: parseFloat(result.accuracy),
      errors: result.errors,
      timeTaken: result.timeTaken,
      completedAt: result.completedAt,
      testText: {
        title: result.title,
        content: result.content,
        language: result.language,
        difficulty: result.difficulty,
      },
    }));

    return c.json({ results: formattedResults });
  } catch (error) {
    console.error('Get results error:', error);
    return c.json({ error: 'Failed to get test results' }, 500);
  }
});

export { testRoutes };
