import { db, users } from '@tactile/database';
import { eq, sql } from 'drizzle-orm';
import { sign, verify } from 'hono/jwt';
import { JWT_SECRET } from '../constants';

/**
 * How long a session survives without the app being opened.
 *
 * This is a sliding window, not a hard cap: `/auth/me` re-issues a token on
 * every app load, so an active user is never logged out. It only runs out for
 * someone who stays away this long.
 */
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface AccessTokenPayload {
  userId: string;
  email: string;
  username: string;
  tokenVersion: number;
  exp: number;
}

export interface TokenSubject {
  id: string;
  email: string;
  username: string;
  tokenVersion?: number;
}

export const signAccessToken = (user: TokenSubject): Promise<string> =>
  sign(
    {
      userId: user.id,
      email: user.email,
      username: user.username,
      tokenVersion: user.tokenVersion ?? 0,
      exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
    },
    JWT_SECRET
  );

/**
 * Verify signature and expiry, then confirm the token belongs to the user's
 * current generation. Throws on anything suspect, so callers can treat a
 * rejection the same way they treat a bad signature.
 */
export const verifyAccessToken = async (
  token: string
): Promise<AccessTokenPayload> => {
  const payload = (await verify(
    token,
    JWT_SECRET
  )) as unknown as AccessTokenPayload;

  if (!payload?.userId) {
    throw new Error('Malformed token payload');
  }

  const current = await db.query.users.findFirst({
    where: eq(users.id, payload.userId),
    columns: { tokenVersion: true },
  });

  if (!current) {
    throw new Error('User no longer exists');
  }

  if ((payload.tokenVersion ?? 0) !== current.tokenVersion) {
    throw new Error('Token has been revoked');
  }

  return payload;
};

/**
 * Invalidate every token this user holds, including the caller's own.
 * Returns the new generation.
 */
export const revokeAllTokens = async (userId: string): Promise<number> => {
  const [updated] = await db
    .update(users)
    .set({ tokenVersion: sql`${users.tokenVersion} + 1`, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ tokenVersion: users.tokenVersion });

  return updated?.tokenVersion ?? 0;
};
