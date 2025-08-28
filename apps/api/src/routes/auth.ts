import { zValidator } from '@hono/zod-validator';
import { db, users } from '@tactile/database';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import { z } from 'zod';
import { OAuthProviderFactory } from '../auth/oauth';
import { JWT_SECRET } from '../constants';
import { setCsrfCookie } from '../middleware/csrf';

const authRoutes = new Hono().basePath('/auth');

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

// Register endpoint
authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  try {
    const { email, username, password } = c.req.valid('json');

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return c.json({ error: 'User already exists' }, 400);
    }

    const existingUsername = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (existingUsername) {
      return c.json({ error: 'Username already taken' }, 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);

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

    setCsrfCookie(c);

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

    setCsrfCookie(c);

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

    setCsrfCookie(c);

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

authRoutes.post('/logout', (c) => {
  return c.json({ message: 'Logged out successfully' });
});

authRoutes.get('/sso/:provider', async (c) => {
  const provider = c.req.param('provider');
  const oauthProvider = OAuthProviderFactory.getProvider(provider);

  if (!oauthProvider) {
    return c.json({ error: 'OAuth provider not supported' }, 400);
  }

  const state = oauthProvider.generateOAuthState();
  const authUrl = oauthProvider.getAuthUrl(state);

  return c.json({ authUrl, state });
});

authRoutes.get('/sso/:provider/callback', async (c) => {
  try {
    const provider = c.req.param('provider');
    const code = c.req.query('code');
    const state = c.req.query('state');

    if (!code) {
      return c.json({ error: 'Authorization code is required' }, 400);
    }

    if (!state) {
      return c.json({ error: 'State parameter is required for security' }, 400);
    }

    const oauthProvider = OAuthProviderFactory.getProvider(provider);
    if (!oauthProvider) {
      return c.json({ error: 'OAuth provider not supported' }, 400);
    }

    if (!oauthProvider.validateOAuthState(state)) {
      return c.json({ error: 'Invalid state parameter' }, 403);
    }

    const oauthUser = await oauthProvider.handleCallback(code, state);
    const { user, isNew } = await oauthProvider.findOrCreateUser(oauthUser);

    const token = await oauthProvider.generateJWT(user);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = new URL('/auth/sso/callback', frontendUrl);

    setCookie(c, 'token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 15 * 60,
      path: '/',
    });

    return c.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('OAuth callback error:', error);
    return c.json({ error: 'OAuth authentication failed' }, 500);
  }
});

export { authRoutes };
