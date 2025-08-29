import { AuthCallback } from '@/pages/AuthCallback';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/auth/sso/callback')({
  component: AuthCallback,
});
