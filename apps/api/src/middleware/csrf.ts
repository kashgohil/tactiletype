import { type MiddlewareHandler } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { CSRFProtection } from '../utils/csrf';

export const csrfProtection = (): MiddlewareHandler => {
  return async (c, next) => {
    if (c.req.method === 'GET') {
      return next();
    }

    const path = c.req.path;

    // Skip CSRF for OAuth callbacks
    if (path.includes('/callback')) {
      return next();
    }

    let csrfToken =
      c.req.header('X-CSRF-Token') || c.req.header('X-XSRF-Token');

    if (!csrfToken) {
      return c.json(
        {
          error: 'CSRF token missing',
          message: 'Request must include a valid CSRF token',
        },
        403
      );
    }

    const cookieToken = getCookie(c, 'csrf-token');

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

export const setCsrfCookie = (c: any) => {
  setCookie(c, 'csrf-token', CSRFProtection.generateToken(), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 15 * 60,
    path: '/',
  });
};
