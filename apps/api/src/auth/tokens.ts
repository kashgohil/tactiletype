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

/**
 * How long a user's token generation is trusted before it is read again.
 *
 * Without this every authenticated request costs a database round trip purely
 * to notice the rare case of a revoked token. A minute of staleness means
 * "Log out on all devices" takes up to a minute to reach a device mid-session,
 * which is the right trade for dropping the read rate to once per user per
 * minute. The window is per process: with more than one API container, each
 * one expires its own copy.
 */
const REVOCATION_CACHE_TTL_MS = 60_000;

/** Bounds the cache so a burst of distinct users cannot grow it without limit. */
const REVOCATION_CACHE_MAX_ENTRIES = 10_000;

const revocationCache = new Map<string, { version: number; expiresAt: number }>();

/** The token is not acceptable - bad signature, expired, or revoked. Answer 401. */
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

const rememberTokenVersion = (userId: string, version: number): void => {
  if (revocationCache.size >= REVOCATION_CACHE_MAX_ENTRIES && !revocationCache.has(userId)) {
    // Map iterates in insertion order, so the first key is the oldest write.
    const oldest = revocationCache.keys().next();
    if (!oldest.done) revocationCache.delete(oldest.value);
  }

  revocationCache.set(userId, {
    version,
    expiresAt: Date.now() + REVOCATION_CACHE_TTL_MS,
  });
};

/**
 * The user's current token generation, or null if the user is gone.
 * Throws RevocationCheckUnavailableError when the answer is unknowable.
 */
const currentTokenVersion = async (userId: string): Promise<number | null> => {
  const cached = revocationCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.version;
  }

  let row: { tokenVersion: number } | undefined;
  try {
    row = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { tokenVersion: true },
    });
  } catch (error) {
    // A dropped pool connection is not a bad token. Prefer a stale generation
    // over ending the session; if there is nothing cached, say so honestly and
    // let the caller return 503.
    if (cached) return cached.version;
    throw new RevocationCheckUnavailableError(
      error instanceof Error ? error.message : 'Revocation check failed'
    );
  }

  if (!row) {
    revocationCache.delete(userId);
    return null;
  }

  rememberTokenVersion(userId, row.tokenVersion);
  return row.tokenVersion;
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
 * confirmed. Callers must keep those apart - see the note on the latter.
 */
export const verifyAccessToken = async (token: string): Promise<AccessTokenPayload> => {
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

  const next = updated?.tokenVersion ?? 0;

  // Publish to this process at once so the caller's own token stops working on
  // the very next request rather than at the end of the cache window. Other
  // containers, if any, pick it up when their copy expires.
  rememberTokenVersion(userId, next);

  return next;
};
