import { useRouterState } from '@tanstack/react-router';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { resolvePageMeta } from '@/lib/seo';

/**
 * Keeps document head in sync with the active route.
 * Mount once under the root layout.
 */
export function Seo() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const meta = resolvePageMeta(pathname);
  useDocumentMeta(meta);
  return null;
}
