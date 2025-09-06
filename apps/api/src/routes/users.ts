import { zValidator } from '@hono/zod-validator';
import { completedTests, db, userProfiles, users } from '@tactile/database';
import { eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { z } from 'zod';
import { AnalyticsEngine } from '../utils/analyticsEngine';

type Variables = {
  user: {
    userId: string;
    email: string;
    username: string;
  };
};

const userRoutes = new Hono<{ Variables: Variables }>();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
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
userRoutes.put(
  '/profile',
  authMiddleware,
  zValidator('json', updateProfileSchema),
  async (c) => {
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
  }
);

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

// Get public user profile by username
userRoutes.get('/:username', async (c) => {
  try {
    const username = c.req.param('username');

    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
      with: {
        profile: true,
      },
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Check if profile is public
    if (user.profile && !user.profile.isPublic) {
      return c.json({ error: 'Profile is private' }, 403);
    }

    // Get public stats
    const stats = await db
      .select({
        totalTests: sql<number>`count(*)`,
        avgWpm: sql<number>`avg(${completedTests.wpm})`,
        bestWpm: sql<number>`max(${completedTests.wpm})`,
        avgAccuracy: sql<number>`avg(${completedTests.accuracy})`,
      })
      .from(completedTests)
      .where(eq(completedTests.userId, user.id));

    return c.json({
      user: {
        id: user.id,
        username: user.username,
        profile: user.profile,
        createdAt: user.createdAt,
      },
      stats: stats[0] || {
        totalTests: 0,
        avgWpm: 0,
        bestWpm: 0,
        avgAccuracy: 0,
      },
    });
  } catch (error) {
    console.error('Get public profile error:', error);
    return c.json({ error: 'Failed to get user profile' }, 500);
  }
});

export { userRoutes };
