import type { Context, MiddlewareHandler } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { CSRFProtection } from '../utils/csrf';

export const CSRF_COOKIE_NAME = 'csrf-token';

// The double-submit cookie must outlive a typing session, not a coffee break.
// It is re-issued on /auth/me, /auth/csrf, login, register, and OAuth callback,
// so this is the ceiling for a tab left open without touching any of those.
const CSRF_COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

// Methods that cannot mutate state need no token.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const csrfProtection = (): MiddlewareHandler => {
  return async (c, next) => {
    if (SAFE_METHODS.has(c.req.method)) {
      return next();
    }

    const path = c.req.path;

    // Skip CSRF for OAuth callbacks and unauthenticated auth bootstrap.
    // Login/register cannot require a double-submit cookie the client does not have yet.
    if (
      path.includes('/callback') ||
      path.endsWith('/auth/login') ||
      path.endsWith('/auth/register')
    ) {
      return next();
    }

    const csrfToken = c.req.header('X-CSRF-Token') || c.req.header('X-XSRF-Token');

    if (!csrfToken) {
      return c.json(
        {
          error: 'CSRF token missing',
          message: 'Request must include a valid CSRF token',
        },
        403
      );
    }

    const cookieToken = getCookie(c, CSRF_COOKIE_NAME);

    // check csrf token from cookie and header
    if (csrfToken !== cookieToken) {
      return c.json(
        {
          error: 'CSRF token invalid',
          message: 'CSRF token is invalid, expired, or has already been used',
        },
        403
      );
    }

    return next();
  };
};

/**
 * Issue a fresh double-submit CSRF cookie and return the token.
 *
 * The cookie is intentionally host-only unless COOKIE_DOMAIN is set: cookies
 * ignore port, so a host-only `localhost` cookie is already shared between the
 * Vite dev server and the API. Set COOKIE_DOMAIN (e.g. `.example.com`) only when
 * the web app and API live on different subdomains.
 */
export const setCsrfCookie = (c: Context): string => {
  const token = CSRFProtection.generateToken();
  const isProduction = process.env.NODE_ENV === 'production';

  setCookie(c, CSRF_COOKIE_NAME, token, {
    httpOnly: false, // the client must read it to echo it back in the header
    secure: isProduction,
    sameSite: isProduction ? 'None' : 'Lax',
    maxAge: CSRF_COOKIE_MAX_AGE,
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    path: '/',
  });

  return token;
};
