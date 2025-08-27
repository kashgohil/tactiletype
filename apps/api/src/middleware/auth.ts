import { verify } from 'hono/jwt';
import { JWT_SECRET } from '../constants';

/**
 * Required auth middleware
 * @param c context
 * @param next next function
 * @returns json error response
 */
export const authMiddleware = async (c: any, next: any) => {
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
