import { getDailyModeForDate, QUOTES } from '@tactile/content';
import {
  completedTests,
  db,
  userAchievements,
  achievements,
  users,
  practiceSessions,
} from '@tactile/database';
import { and, desc, eq, gte, lt } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { AnalyticsEngine } from '../utils/analyticsEngine';

type Variables = {
  user: {
    userId: string;
    email: string;
    username: string;
  };
};

const challengeRoutes = new Hono<{ Variables: Variables }>();

/** Deterministic daily text from UTC date. */
export function getDailyChallengeForDate(date = new Date()) {
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dayKey = utc.toISOString().slice(0, 10);
  const seed = dayKey
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const quote = QUOTES[seed % QUOTES.length]!;
  return {
    date: dayKey,
    title: `Daily challenge · ${dayKey}`,
    content: quote.text,
    author: quote.author,
    language: 'en',
    difficulty: 'medium' as const,
    wordCount: quote.text.trim().split(/\s+/).length,
  };
}

// Public: today's challenge text
challengeRoutes.get('/daily', async (c) => {
  try {
    const challenge = getDailyChallengeForDate();
    return c.json({ challenge });
  } catch (error) {
    console.error('Daily challenge error:', error);
    return c.json({ error: 'Failed to get daily challenge' }, 500);
  }
});

async function dailyLeaderboardForKind(
  exerciseKind: string,
  date: string,
  limit: number
) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const rows = await db
    .select({
      userId: completedTests.userId,
      username: users.username,
      wpm: completedTests.wpm,
      accuracy: completedTests.accuracy,
      completedAt: completedTests.completedAt,
    })
    .from(completedTests)
    .innerJoin(users, eq(completedTests.userId, users.id))
    .where(
      and(
        eq(completedTests.exerciseKind, exerciseKind),
        gte(completedTests.completedAt, start),
        lt(completedTests.completedAt, end)
      )
    )
    .orderBy(desc(completedTests.wpm))
    .limit(Math.max(limit * 4, 40));

  const best = new Map<
    string,
    { userId: string; username: string; wpm: number; accuracy: number }
  >();
  for (const row of rows) {
    const wpm = parseFloat(String(row.wpm));
    const accuracy = parseFloat(String(row.accuracy));
    const existing = best.get(row.userId);
    if (
      !existing ||
      wpm > existing.wpm ||
      (wpm === existing.wpm && accuracy > existing.accuracy)
    ) {
      best.set(row.userId, {
        userId: row.userId,
        username: row.username,
        wpm,
        accuracy,
      });
    }
  }

  return [...best.values()]
    .sort((a, b) => b.wpm - a.wpm || b.accuracy - a.accuracy)
    .slice(0, limit);
}

// Daily leaderboard (results tagged as daily_challenge for today)
challengeRoutes.get('/daily/leaderboard', async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
    const challenge = getDailyChallengeForDate();
    const leaderboard = await dailyLeaderboardForKind(
      'daily_challenge',
      challenge.date,
      limit
    );
    return c.json({ date: challenge.date, leaderboard });
  } catch (error) {
    console.error('Daily leaderboard error:', error);
    return c.json({ error: 'Failed to get daily leaderboard' }, 500);
  }
});

// Mode of the day (rotating play mode — not the same quote test)
challengeRoutes.get('/daily/mode', async (c) => {
  try {
    const mode = getDailyModeForDate();
    return c.json({ mode });
  } catch (error) {
    console.error('Daily mode error:', error);
    return c.json({ error: 'Failed to get daily mode' }, 500);
  }
});

challengeRoutes.get('/daily/mode/leaderboard', async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
    const mode = getDailyModeForDate();
    const leaderboard = await dailyLeaderboardForKind(
      'daily_mode',
      mode.date,
      limit
    );
    return c.json({
      date: mode.date,
      modeId: mode.modeId,
      title: mode.title,
      leaderboard,
    });
  } catch (error) {
    console.error('Daily mode leaderboard error:', error);
    return c.json({ error: 'Failed to get daily mode leaderboard' }, 500);
  }
});

const curriculumSchema = z.object({
  unlockedThrough: z.number().int().min(0).max(50),
  completed: z.array(z.string()).max(50),
  bests: z
    .record(
      z.object({
        accuracy: z.number(),
        wpm: z.number(),
        at: z.string(),
      })
    )
    .optional()
    .default({}),
});

// Curriculum progress (sync local path across devices)
challengeRoutes.get('/curriculum', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as Variables['user'];
    const rows = await db
      .select()
      .from(practiceSessions)
      .where(
        and(
          eq(practiceSessions.userId, user.userId),
          eq(practiceSessions.focusArea, 'curriculum')
        )
      )
      .orderBy(desc(practiceSessions.createdAt))
      .limit(1);

    if (!rows[0]) {
      return c.json({
        progress: { unlockedThrough: 0, completed: [], bests: {} },
      });
    }

    let progress = { unlockedThrough: 0, completed: [] as string[], bests: {} };
    try {
      const data = JSON.parse(rows[0].sessionData);
      progress = data.progress ?? data;
    } catch {
      /* default */
    }
    return c.json({ progress });
  } catch (error) {
    console.error('Curriculum get error:', error);
    return c.json({ error: 'Failed to load curriculum' }, 500);
  }
});

challengeRoutes.put('/curriculum', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as Variables['user'];
    const body = await c.req.json();
    const parsed = curriculumSchema.safeParse(body.progress ?? body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid progress payload' }, 400);
    }

    await db.insert(practiceSessions).values({
      userId: user.userId,
      focusArea: 'curriculum',
      targetContent: 'lesson-path',
      sessionData: JSON.stringify({ progress: parsed.data, v: 1 }),
      duration: 0,
      improvementScore: String(
        Math.round(
          (parsed.data.completed.length / Math.max(1, 10)) * 100
        )
      ),
    });

    return c.json({ ok: true, progress: parsed.data });
  } catch (error) {
    console.error('Curriculum save error:', error);
    return c.json({ error: 'Failed to save curriculum' }, 500);
  }
});

// User achievements
challengeRoutes.get('/achievements', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as Variables['user'];

    const all = await db
      .select()
      .from(achievements)
      .where(eq(achievements.isActive, true));

    const unlocked = await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, user.userId));

    const unlockedMap = new Map(
      unlocked.map((u) => [u.achievementId, u])
    );

    const list = all.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      category: a.category,
      badgeIcon: a.badgeIcon,
      points: a.points,
      rarity: a.rarity,
      unlocked: unlockedMap.has(a.id),
      unlockedAt: unlockedMap.get(a.id)?.unlockedAt ?? null,
    }));

    return c.json({ achievements: list });
  } catch (error) {
    console.error('Achievements error:', error);
    return c.json({ error: 'Failed to get achievements' }, 500);
  }
});

/** Evaluate and unlock achievements for a user. Call after result submit. */
export async function evaluateAchievements(userId: string) {
  const all = await db
    .select()
    .from(achievements)
    .where(eq(achievements.isActive, true));

  const unlocked = await db
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));
  const unlockedIds = new Set(unlocked.map((u) => u.achievementId));

  const tests = await db.query.completedTests.findMany({
    where: eq(completedTests.userId, userId),
    columns: {
      wpm: true,
      accuracy: true,
      timeTaken: true,
      completedAt: true,
      exerciseKind: true,
    },
  });

  const stats = AnalyticsEngine.calculateUserStats(tests);
  const hasDaily = tests.some(
    (t) =>
      t.exerciseKind === 'daily_challenge' || t.exerciseKind === 'daily_mode'
  );
  const newlyUnlocked: string[] = [];

  for (const ach of all) {
    if (unlockedIds.has(ach.id)) continue;
    let criteria: { type: string; value: number };
    try {
      criteria = JSON.parse(ach.criteria);
    } catch {
      continue;
    }

    let met = false;
    switch (criteria.type) {
      case 'tests_completed':
        met = stats.totalTests >= criteria.value;
        break;
      case 'best_wpm':
        met = stats.bestWpm >= criteria.value;
        break;
      case 'best_accuracy':
        met = stats.bestAccuracy >= criteria.value;
        break;
      case 'streak':
        met = stats.currentStreak >= criteria.value;
        break;
      case 'daily_challenge':
        met = hasDaily && criteria.value >= 1;
        break;
    }

    if (met) {
      await db.insert(userAchievements).values({
        userId,
        achievementId: ach.id,
        progress: '100',
      });
      newlyUnlocked.push(ach.name);
    }
  }

  return newlyUnlocked;
}

// Evaluate after a session (auth)
challengeRoutes.post('/achievements/evaluate', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as Variables['user'];
    const newlyUnlocked = await evaluateAchievements(user.userId);
    return c.json({ newlyUnlocked });
  } catch (error) {
    console.error('Evaluate achievements error:', error);
    return c.json({ error: 'Failed to evaluate achievements' }, 500);
  }
});

export { challengeRoutes };
