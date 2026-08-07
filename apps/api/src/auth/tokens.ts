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

/** The token is not acceptable — bad signature, expired, or revoked. Answer 401. */
export class InvalidTokenError extends Error {
  override readonly name = 'InvalidTokenError';
}

/**
 * The token's signature is good but its generation could not be checked,
 * because the database could not be reached.
 *
 * This is deliberately NOT an InvalidTokenError. Callers must answer 503, not
 * 401: a client cannot tell a rejected token from an unreachable database, so
 * a 401 here makes every connection blip look like an expired session and logs
 * the whole user base out.
 */
export class RevocationCheckUnavailableError extends Error {
  override readonly name = 'RevocationCheckUnavailableError';
}

/**
 * The user's current token generation, or null if the user is gone.
 * Throws RevocationCheckUnavailableError when the answer is unknowable.
 */
const currentTokenVersion = async (userId: string): Promise<number | null> => {
  let row;
  try {
    row = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { tokenVersion: true },
    });
  } catch (error) {
    // A dropped pool connection is not a bad token — say so honestly and let
    // the caller answer 503 rather than ending the session.
    throw new RevocationCheckUnavailableError(
      error instanceof Error ? error.message : 'Revocation check failed'
    );
  }

  return row ? row.tokenVersion : null;
};

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
 * current generation.
 *
 * Throws InvalidTokenError when the token is genuinely no good, and
 * RevocationCheckUnavailableError when it might be fine but cannot be
 * confirmed. Callers must keep those apart — see the note on the latter.
 */
export const verifyAccessToken = async (
  token: string
): Promise<AccessTokenPayload> => {
  let payload: AccessTokenPayload;
  try {
    payload = (await verify(token, JWT_SECRET)) as unknown as AccessTokenPayload;
  } catch (error) {
    throw new InvalidTokenError(
      error instanceof Error ? error.message : 'Token verification failed'
    );
  }

  if (!payload?.userId) {
    throw new InvalidTokenError('Malformed token payload');
  }

  const current = await currentTokenVersion(payload.userId);

  if (current === null) {
    throw new InvalidTokenError('User no longer exists');
  }

  if ((payload.tokenVersion ?? 0) !== current) {
    throw new InvalidTokenError('Token has been revoked');
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
