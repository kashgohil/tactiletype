import { VITE_API_URL } from '@/constants';

const CSRF_COOKIE_NAME = 'csrf-token';

/**
 * Get CSRF token from browser cookies
 */
export const getCsrfTokenFromCookie = (): string | null => {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === CSRF_COOKIE_NAME) {
      return decodeURIComponent(value ?? '');
    }
  }
  return null;
};

// Concurrent writes (a result submit plus its analytics follow-up, say) must not
// each mint their own token - the last cookie written would invalidate the rest.
let inflightRefresh: Promise<string | null> | null = null;

/**
 * Ask the API for a fresh CSRF cookie and return the token it issued.
 */
export const refreshCsrfToken = async (): Promise<string | null> => {
  if (!inflightRefresh) {
    inflightRefresh = fetch(`${VITE_API_URL}/api/auth/csrf`, {
      credentials: 'include',
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { token?: string } | null) => body?.token ?? null)
      .catch(() => null)
      .finally(() => {
        inflightRefresh = null;
      });
  }
  return inflightRefresh;
};

/**
 * The token to echo back in the X-CSRF-Token header, fetching one if this client
 * has none yet (first write of a session, or the cookie expired under it).
 */
export const ensureCsrfToken = async (): Promise<string | null> => {
  return getCsrfTokenFromCookie() ?? (await refreshCsrfToken());
};
