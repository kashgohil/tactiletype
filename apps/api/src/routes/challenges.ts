import { QUOTES } from '@tactile/content';
import {
  completedTests,
  db,
  userAchievements,
  achievements,
  users,
} from '@tactile/database';
import { and, desc, eq, gte, lt } from 'drizzle-orm';
import { Hono } from 'hono';
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

// Daily leaderboard (results tagged as daily_challenge for today)
challengeRoutes.get('/daily/leaderboard', async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
    const challenge = getDailyChallengeForDate();
    const start = new Date(`${challenge.date}T00:00:00.000Z`);
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
          eq(completedTests.exerciseKind, 'daily_challenge'),
          gte(completedTests.completedAt, start),
          lt(completedTests.completedAt, end)
        )
      )
      .orderBy(desc(completedTests.wpm))
      .limit(limit);

    // Best attempt per user
    const best = new Map<
      string,
      { userId: string; username: string; wpm: number; accuracy: number }
    >();
    for (const row of rows) {
      const wpm = parseFloat(String(row.wpm));
      const existing = best.get(row.userId);
      if (!existing || wpm > existing.wpm) {
        best.set(row.userId, {
          userId: row.userId,
          username: row.username,
          wpm,
          accuracy: parseFloat(String(row.accuracy)),
        });
      }
    }

    const leaderboard = [...best.values()].sort((a, b) => b.wpm - a.wpm);
    return c.json({ date: challenge.date, leaderboard });
  } catch (error) {
    console.error('Daily leaderboard error:', error);
    return c.json({ error: 'Failed to get daily leaderboard' }, 500);
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
  const hasDaily = tests.some((t) => t.exerciseKind === 'daily_challenge');
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
