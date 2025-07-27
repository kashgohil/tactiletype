import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { verify } from 'hono/jwt';
import { z } from 'zod';
import { db, testTexts, testResults, users } from '@tactile/database';
import { eq, desc, and, gte, sql } from 'drizzle-orm';

type Variables = {
  user: {
    userId: string;
    email: string;
    username: string;
  };
};

const testRoutes = new Hono<{ Variables: Variables }>();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token (optional for some routes)
const optionalAuthMiddleware = async (c: any, next: any) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await verify(token, JWT_SECRET);
      c.set('user', payload);
    }
    
    await next();
  } catch (error) {
    // Continue without auth if token is invalid
    await next();
  }
};

// Required auth middleware
const authMiddleware = async (c: any, next: any) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const token = authHeader.substring(7);
    const payload = await verify(token, JWT_SECRET);
    
    c.set('user', payload);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
};

// Test result submission schema
const submitResultSchema = z.object({
  testTextId: z.string().uuid(),
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

// Submit test result
testRoutes.post('/results', authMiddleware, zValidator('json', submitResultSchema), async (c) => {
  try {
    const user = c.get('user') as any;
    const resultData = c.req.valid('json');

    // Verify test text exists
    const testText = await db.query.testTexts.findFirst({
      where: eq(testTexts.id, resultData.testTextId),
    });

    if (!testText) {
      return c.json({ error: 'Test text not found' }, 404);
    }

    // Insert test result
    const [result] = await db.insert(testResults).values({
      userId: user.userId,
      testTextId: resultData.testTextId,
      wpm: resultData.wpm.toString(),
      accuracy: resultData.accuracy.toString(),
      errors: resultData.errors,
      timeTaken: resultData.timeTaken,
      keystrokeData: resultData.keystrokeData,
    }).returning();

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
});

// Get leaderboard
testRoutes.get('/leaderboard', async (c) => {
  try {
    const timeframe = c.req.query('timeframe') || 'all'; // daily, weekly, monthly, all
    const limit = parseInt(c.req.query('limit') || '100');

    let timeFilter;
    switch (timeframe) {
      case 'daily':
        timeFilter = gte(testResults.completedAt, sql`now() - interval '1 day'`);
        break;
      case 'weekly':
        timeFilter = gte(testResults.completedAt, sql`now() - interval '1 week'`);
        break;
      case 'monthly':
        timeFilter = gte(testResults.completedAt, sql`now() - interval '1 month'`);
        break;
      default:
        timeFilter = undefined;
    }

    const leaderboard = await db
      .select({
        userId: testResults.userId,
        username: users.username,
        bestWpm: sql<number>`max(${testResults.wpm})`,
        avgWpm: sql<number>`avg(${testResults.wpm})`,
        avgAccuracy: sql<number>`avg(${testResults.accuracy})`,
        testCount: sql<number>`count(*)`,
      })
      .from(testResults)
      .innerJoin(users, eq(testResults.userId, users.id))
      .where(timeFilter)
      .groupBy(testResults.userId, users.username)
      .orderBy(desc(sql`max(${testResults.wpm})`))
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

    const results = await db.query.testResults.findMany({
      where: eq(testResults.userId, user.userId),
      orderBy: desc(testResults.completedAt),
      limit,
      offset,
      with: {
        testText: {
          columns: { title: true, language: true, difficulty: true },
        },
      },
    });

    const formattedResults = results.map(result => ({
      id: result.id,
      wpm: parseFloat(result.wpm),
      accuracy: parseFloat(result.accuracy),
      errors: result.errors,
      timeTaken: result.timeTaken,
      completedAt: result.completedAt,
      testText: result.testText,
    }));

    return c.json({ results: formattedResults });

  } catch (error) {
    console.error('Get results error:', error);
    return c.json({ error: 'Failed to get test results' }, 500);
  }
});

export { testRoutes };