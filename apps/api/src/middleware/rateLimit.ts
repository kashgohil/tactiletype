import type { Context, MiddlewareHandler } from 'hono';

/**
 * Failure throttling for credential endpoints.
 *
 * Only *failed* attempts are counted, so somebody who signs in correctly ten
 * times in a row is never throttled - the budget exists to make guessing
 * expensive, not to ration logins.
 *
 * State lives in this process and is lost on restart. That is the honest limit
 * of this approach: a deploy hands every attacker a fresh budget, and a second
 * API container would keep its own tally. Both are acceptable while the API is
 * one container, and the fix when it stops being one is to move the counters
 * into Postgres - the shape below does not change.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * A single host gets the tighter budget: it is the one an attacker actually
 * controls, and ten wrong passwords in a quarter of an hour is already far more
 * than a person fumbling their own password produces.
 */
const MAX_FAILURES_PER_IP = 10;

/**
 * The per-account budget is deliberately looser than the per-IP one. Any single
 * host burns through its own budget first, so locking a specific victim out
 * takes several distinct IPs and twenty wrong guesses - a real distributed
 * attack, which is exactly the case worth blocking. Were this the tighter of
 * the two, anyone could freeze anyone else's account by failing to log in as
 * them.
 */
const MAX_FAILURES_PER_ACCOUNT = 20;

/** Expired buckets are swept in-band rather than on a timer, at most this often. */
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

/** Long enough for any real address, short enough that keys cannot be padded. */
const MAX_KEY_LENGTH = 320;

interface Bucket {
  failures: number;
  resetAt: number;
}

interface Guard {
  key: string;
  limit: number;
}

const buckets = new Map<string, Bucket>();
let lastSweptAt = Date.now();

const sweepExpired = (now: number): void => {
  if (now - lastSweptAt < SWEEP_INTERVAL_MS) return;
  lastSweptAt = now;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
};

/**
 * The caller's address as seen by nginx.
 *
 * Every request reaches Bun over loopback, so the socket's peer address is
 * always 127.0.0.1 and useless here. nginx sets `X-Real-IP` with
 * `proxy_set_header`, which *replaces* whatever the client sent, so it cannot
 * be spoofed from outside and is the first choice.
 *
 * `X-Forwarded-For` is the fallback, and the LAST entry is the one to read:
 * nginx builds it with `$proxy_add_x_forwarded_for`, which appends the real
 * peer to any value the client supplied. Taking the first entry - the usual
 * instinct - reads a field the attacker wrote, letting them mint a fresh
 * budget per request.
 */
const clientIp = (c: Context): string => {
  const realIp = c.req.header('X-Real-IP')?.trim();
  if (realIp) return realIp.slice(0, MAX_KEY_LENGTH);

  const forwarded = c.req.header('X-Forwarded-For');
  if (forwarded) {
    const hops = forwarded.split(',');
    const peer = hops[hops.length - 1]?.trim();
    if (peer) return peer.slice(0, MAX_KEY_LENGTH);
  }

  // No proxy headers at all - direct access in local development. One shared
  // bucket is the safe reading: it throttles rather than exempts.
  return 'unknown';
};

/**
 * The account being attempted, lowercased so `Me@x.com` and `me@x.com` share a
 * budget. Returns null when the body is unreadable; such a request never
 * reaches a password comparison, so it costs nothing worth rationing.
 *
 * Reading the body here is safe ahead of the zod validator: Hono caches the
 * parsed JSON on the request, so the validator downstream gets the cached copy
 * rather than a consumed stream.
 */
const attemptedAccount = async (c: Context): Promise<string | null> => {
  try {
    const body = (await c.req.json()) as { email?: unknown };
    if (typeof body?.email !== 'string') return null;

    const email = body.email.trim().toLowerCase();
    return email.length > 0 && email.length <= MAX_KEY_LENGTH ? email : null;
  } catch {
    return null;
  }
};

const secondsUntil = (resetAt: number, now: number): number =>
  Math.max(1, Math.ceil((resetAt - now) / 1000));

/**
 * Throttle repeated failures on a credential endpoint.
 *
 * `isFailure` decides which responses count against the budget. It is passed
 * the status rather than reading it here so that, for example, a 400 from
 * schema validation is not mistaken for a wrong password.
 */
export const failureRateLimit = (options: {
  isFailure: (status: number) => boolean;
}): MiddlewareHandler => {
  return async (c, next) => {
    const now = Date.now();
    sweepExpired(now);

    const account = await attemptedAccount(c);
    const guards: Guard[] = [
      { key: `ip:${clientIp(c)}`, limit: MAX_FAILURES_PER_IP },
      ...(account ? [{ key: `account:${account}`, limit: MAX_FAILURES_PER_ACCOUNT }] : []),
    ];

    for (const guard of guards) {
      const bucket = buckets.get(guard.key);
      if (bucket && bucket.resetAt > now && bucket.failures >= guard.limit) {
        const retryAfter = secondsUntil(bucket.resetAt, now);
        c.header('Retry-After', String(retryAfter));

        // Identical wording whichever budget ran out. Saying "too many attempts
        // on this account" would confirm the address is registered to anyone
        // willing to spend twenty requests finding out.
        //
        // The whole sentence goes in `error` because that is the field the web
        // client reads to build the message it shows; a separate `message` here
        // would be dropped on the floor.
        const minutes = Math.ceil(retryAfter / 60);
        return c.json(
          {
            error: `Too many failed attempts. Try again in ${minutes} minute${
              minutes === 1 ? '' : 's'
            }.`,
          },
          429
        );
      }
    }

    await next();

    const status = c.res.status;

    if (options.isFailure(status)) {
      for (const guard of guards) {
        const existing = buckets.get(guard.key);
        if (existing && existing.resetAt > now) {
          existing.failures += 1;
        } else {
          // A fresh window starts at the first failure, so the budget is
          // "N failures within 15 minutes of the first one", not a clock that
          // an attacker can straddle.
          buckets.set(guard.key, { failures: 1, resetAt: now + WINDOW_MS });
        }
      }
      return;
    }

    // Proof the real owner is here - forgive the earlier fumbling so they are
    // not throttled on their next visit.
    if (status < 400) {
      for (const guard of guards) buckets.delete(guard.key);
    }
  };
};

/**
 * Login rejects bad credentials with 401 and nothing else does, so that alone
 * marks a failed guess. A 400 is a malformed body and a 5xx is our fault;
 * neither should spend the caller's budget.
 */
export const loginRateLimit = (): MiddlewareHandler =>
  failureRateLimit({ isFailure: (status) => status === 401 });
