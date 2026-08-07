import { verifyAccessToken } from '../auth/tokens';

/**
 * Middleware to verify JWT token (optional for some routes)
 * @param c context
 * @param next next function
 */
export const optionalAuthMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    try {
      c.set('user', await verifyAccessToken(authHeader.substring(7)));
    } catch {
      // Anonymous is a valid outcome on these routes, so an unusable token —
      // for any reason, including an unreachable database — just means no user.
    }
  }

  // Outside the try: the old version ran next() in both branches, so a route
  // that threw was retried a second time before the error escaped.
  await next();
};
