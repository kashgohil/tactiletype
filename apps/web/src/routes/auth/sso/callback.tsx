import { createFileRoute } from '@tanstack/react-router';
import { AuthCallback } from '@/pages/AuthCallback';

export const Route = createFileRoute('/auth/sso/callback')({
  component: AuthCallback,
});
