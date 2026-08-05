import { verifyAccessToken } from '../auth/tokens';

/**
 * Middleware to verify JWT token (optional for some routes)
 * @param c context
 * @param next next function
 */
export const optionalAuthMiddleware = async (c: any, next: any) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await verifyAccessToken(token);
      c.set('user', payload);
    }

    await next();
  } catch (error) {
    // Continue without auth if token is invalid
    await next();
  }
};
