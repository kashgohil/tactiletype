import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * Canonical typing test lives at `/`. Keep `/test` as a redirect so old links
 * and in-app navigations still work without duplicating the page for SEO.
 */
export const Route = createFileRoute('/test')({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/',
      search: search as Record<string, unknown>,
      replace: true,
    });
  },
});
