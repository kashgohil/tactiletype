import {
  type AccessTokenPayload,
  RevocationCheckUnavailableError,
  verifyAccessToken,
} from '../auth/tokens';

/**
 * Required auth middleware
 * @param c context
 * @param next next function
 * @returns json error response
 */
export const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'No token provided' }, 401);
  }

  let payload: AccessTokenPayload;
  try {
    payload = await verifyAccessToken(authHeader.substring(7));
  } catch (error) {
    // 503, not 401: the token may be perfectly good and we simply could not
    // check it. A 401 here would tell the client to discard a valid session.
    if (error instanceof RevocationCheckUnavailableError) {
      console.error('Auth check unavailable:', error);
      return c.json({ error: 'Authentication temporarily unavailable' }, 503);
    }
    return c.json({ error: 'Invalid token' }, 401);
  }

  c.set('user', payload);

  // Deliberately outside the catch above. Wrapping it meant any error thrown by
  // a downstream route surfaced as "Invalid token", so a bug in one handler
  // logged the user out.
  await next();
};
