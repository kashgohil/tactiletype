import { zValidator } from '@hono/zod-validator';
import { completedTests, db, userProfiles, users } from '@tactile/database';
import { eq } from 'drizzle-orm';
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

const userRoutes = new Hono<{ Variables: Variables }>();

// Profile update schema
const updateProfileSchema = z.object({
  displayName: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  country: z.string().length(2).optional(),
  keyboard: z.string().max(100).optional(),
  preferredLanguage: z.string().max(10).optional(),
  isPublic: z.boolean().optional(),
});

// Get user profile
userRoutes.get('/profile', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as any;

    const userWithProfile = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
      with: {
        profile: true,
      },
    });

    if (!userWithProfile) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({
      user: {
        id: userWithProfile.id,
        email: userWithProfile.email,
        username: userWithProfile.username,
        profile: userWithProfile.profile,
        createdAt: userWithProfile.createdAt,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return c.json({ error: 'Failed to get profile' }, 500);
  }
});

// Update user profile
userRoutes.put('/profile', authMiddleware, zValidator('json', updateProfileSchema), async (c) => {
  try {
    const user = c.get('user') as any;
    const profileData = c.req.valid('json');

    // Check if profile exists
    const existingProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, user.userId),
    });

    if (existingProfile) {
      // Update existing profile
      const [updatedProfile] = await db
        .update(userProfiles)
        .set(profileData)
        .where(eq(userProfiles.userId, user.userId))
        .returning();

      return c.json({
        message: 'Profile updated successfully',
        profile: updatedProfile,
      });
    } else {
      // Create new profile
      const [newProfile] = await db
        .insert(userProfiles)
        .values({
          userId: user.userId,
          ...profileData,
        })
        .returning();

      return c.json({
        message: 'Profile created successfully',
        profile: newProfile,
      });
    }
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

// Get user statistics
userRoutes.get('/stats', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as any;

    // Calculate statistics from all user's tests
    const allUserTests = await db.query.completedTests.findMany({
      where: eq(completedTests.userId, user.userId),
      columns: {
        wpm: true,
        accuracy: true,
        timeTaken: true,
        completedAt: true,
      },
    });

    const stats = AnalyticsEngine.calculateUserStats(allUserTests);

    return c.json({ stats });
  } catch (error) {
    console.error('Get stats error:', error);
    return c.json({ error: 'Failed to get user statistics' }, 500);
  }
});

// Public profile by username (honors isPublic; no email)
userRoutes.get('/u/:username', async (c) => {
  try {
    const username = c.req.param('username');

    const found = await db.query.users.findFirst({
      where: eq(users.username, username),
      with: {
        profile: true,
      },
      columns: {
        id: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!found) {
      return c.json({ error: 'User not found' }, 404);
    }

    const isPublic = found.profile?.isPublic !== false;
    if (!isPublic) {
      return c.json({ error: 'This profile is private' }, 403);
    }

    const allUserTests = await db.query.completedTests.findMany({
      where: eq(completedTests.userId, found.id),
      columns: {
        wpm: true,
        accuracy: true,
        timeTaken: true,
        completedAt: true,
      },
    });

    const stats = AnalyticsEngine.calculateUserStats(allUserTests);

    const recent = await db.query.completedTests.findMany({
      where: eq(completedTests.userId, found.id),
      orderBy: (t, { desc }) => [desc(t.completedAt)],
      limit: 5,
      columns: {
        id: true,
        wpm: true,
        accuracy: true,
        timeTaken: true,
        title: true,
        mode: true,
        testType: true,
        completedAt: true,
      },
    });

    return c.json({
      user: {
        id: found.id,
        username: found.username,
        avatarUrl: found.avatarUrl,
        createdAt: found.createdAt,
        profile: found.profile
          ? {
              displayName: found.profile.displayName,
              bio: found.profile.bio,
              country: found.profile.country,
              keyboard: found.profile.keyboard,
              preferredLanguage: found.profile.preferredLanguage,
            }
          : null,
      },
      stats,
      recentResults: recent.map((r) => ({
        id: r.id,
        wpm: parseFloat(String(r.wpm)),
        accuracy: parseFloat(String(r.accuracy)),
        timeTaken: r.timeTaken,
        title: r.title,
        mode: r.mode,
        testType: r.testType,
        completedAt: r.completedAt,
      })),
    });
  } catch (error) {
    console.error('Public profile error:', error);
    return c.json({ error: 'Failed to get public profile' }, 500);
  }
});

export { userRoutes };
