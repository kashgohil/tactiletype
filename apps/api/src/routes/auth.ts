import { zValidator } from '@hono/zod-validator';
import { db, users } from '@tactile/database';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { z } from 'zod';

const authRoutes = new Hono();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Register endpoint
authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  try {
    const { email, username, password } = c.req.valid('json');

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return c.json({ error: 'User already exists' }, 400);
    }

    // Check if username is taken
    const existingUsername = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (existingUsername) {
      return c.json({ error: 'Username already taken' }, 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        username,
        passwordHash,
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        createdAt: users.createdAt,
      });

    if (!newUser) {
      return c.json({ error: 'Failed to create user' }, 500);
    }

    // Generate JWT token
    const token = await sign(
      {
        userId: newUser.id,
        email: newUser.email,
        username: newUser.username,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
      },
      JWT_SECRET
    );

    return c.json({
      message: 'User registered successfully',
      user: newUser,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

// Login endpoint
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json');

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user || !user.passwordHash) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Generate JWT token
    const token = await sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
      },
      JWT_SECRET
    );

    return c.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// Get current user endpoint
authRoutes.get('/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const token = authHeader.substring(7);
    const payload = await verify(token, JWT_SECRET);

    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId as string),
      with: {
        profile: true,
      },
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        profile: user.profile,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// Logout endpoint (client-side token removal)
authRoutes.post('/logout', (c) => {
  return c.json({ message: 'Logged out successfully' });
});

export { authRoutes };
