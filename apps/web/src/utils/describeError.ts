import { isAxiosError } from 'axios';

/**
 * Turns a thrown request error into a sentence worth showing a user.
 *
 * Relies on the API's `{ error: string }` body. Blob responses are normalised
 * back into that shape by the interceptor in services/api.ts, so downloads
 * describe themselves as well as ordinary JSON calls do.
 */
export function describeError(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.error;
    if (typeof message === 'string') return message;
    if (!error.response) return 'Could not reach the server.';
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}
