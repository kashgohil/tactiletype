import { zValidator } from '@hono/zod-validator';
import { db, users } from '@tactile/database';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { OAuthProviderFactory } from '../auth/oauth';
import {
  type AccessTokenPayload,
  RevocationCheckUnavailableError,
  revokeAllTokens,
  signAccessToken,
  verifyAccessToken,
} from '../auth/tokens';
import { authMiddleware } from '../middleware/auth';
import { setCsrfCookie } from '../middleware/csrf';
import { loginRateLimit } from '../middleware/rateLimit';

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
        tokenVersion: users.tokenVersion,
        createdAt: users.createdAt,
      });

    if (!newUser) {
      return c.json({ error: 'Failed to create user' }, 500);
    }

    const token = await signAccessToken(newUser);

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

// Login endpoint.
//
// The throttle sits ahead of the validator so a flood of malformed bodies still
// counts toward nothing - only the 401s the handler returns do.
authRoutes.post('/login', loginRateLimit(), zValidator('json', loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json');

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user?.passwordHash) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const token = await signAccessToken(user);

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
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'No token provided' }, 401);
  }

  let payload: AccessTokenPayload;
  try {
    payload = await verifyAccessToken(authHeader.substring(7));
  } catch (error) {
    if (error instanceof RevocationCheckUnavailableError) {
      console.error('Auth check unavailable:', error);
      return c.json({ error: 'Authentication temporarily unavailable' }, 503);
    }
    console.error('Auth verification error:', error);
    return c.json({ error: 'Invalid token' }, 401);
  }

  // Past this point the token is known good, so nothing below may answer 401 -
  // this is the endpoint the client trusts to decide whether a session is over,
  // and a database hiccup here used to read as "your token is bad".
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
      with: {
        profile: true,
      },
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    setCsrfCookie(c);

    // Slide the session forward. This runs on every app load, so a user who
    // keeps showing up is never logged out; the window only elapses for someone
    // who stays away for the full ACCESS_TOKEN_TTL.
    const refreshedToken = await signAccessToken(user);

    return c.json({
      token: refreshedToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        profile: user.profile,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Failed to load the authenticated user:', error);
    return c.json({ error: 'Could not load your account right now' }, 503);
  }
});

authRoutes.post('/logout', (c) => {
  return c.json({ message: 'Logged out successfully' });
});

// Invalidate every token this user holds, on every device, including the caller's.
authRoutes.post('/logout-all', authMiddleware, async (c) => {
  try {
    const payload = c.get('user') as { userId: string };
    await revokeAllTokens(payload.userId);
    return c.json({ message: 'Signed out on all devices' });
  } catch (error) {
    console.error('Failed to revoke tokens:', error);
    return c.json({ error: 'Failed to sign out other devices' }, 500);
  }
});

// Issue a fresh CSRF cookie. The client calls this before a write when it has no
// token yet, and again if a write is rejected because the cookie expired.
authRoutes.get('/csrf', (c) => {
  const token = setCsrfCookie(c);
  return c.json({ token });
});

// OAuth routes
authRoutes.get('/sso/:provider', async (c) => {
  const provider = c.req.param('provider');
  const oauthProvider = OAuthProviderFactory.getProvider(provider);

  if (!oauthProvider) {
    return c.json({ error: 'OAuth provider not supported' }, 400);
  }

  // Generate secure state parameter for CSRF protection
  const state = oauthProvider.generateOAuthState();

  const authUrl = oauthProvider.getAuthUrl(state);

  return c.json({ authUrl, state });
});

authRoutes.get('/sso/:provider/callback', async (c) => {
  try {
    const provider = c.req.param('provider');
    const code = c.req.query('code');
    const state = c.req.query('state');

    console.log('OAuth callback received:', {
      provider,
      hasCode: !!code,
      hasState: !!state,
      state: `${state?.substring(0, 8)}...`,
      timestamp: new Date().toISOString(),
    });

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

    // Validate state parameter for OAuth protection
    if (!oauthProvider.validateOAuthState(state)) {
      console.error('OAuth state validation failed:', {
        provider,
        state: `${state?.substring(0, 8)}...`,
        timestamp: new Date().toISOString(),
        userAgent: c.req.header('User-Agent'),
      });
      return c.json(
        {
          error: 'Invalid state parameter',
          message: 'The OAuth state has expired or is invalid. Please try logging in again.',
        },
        403
      );
    }

    // Handle OAuth callback
    const oauthUser = await oauthProvider.handleCallback(code, state);

    // Find or create user
    const { user, isNew } = await oauthProvider.findOrCreateUser(oauthUser);

    // Generate JWT token
    const token = await oauthProvider.generateJWT(user);

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3020';
    const redirectUrl = new URL('/auth/sso/callback', frontendUrl);
    redirectUrl.searchParams.set('token', token);
    redirectUrl.searchParams.set('isNew', isNew.toString());

    return c.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('OAuth callback error:', error);
    return c.json({ error: 'OAuth authentication failed' }, 500);
  }
});

export { authRoutes };
