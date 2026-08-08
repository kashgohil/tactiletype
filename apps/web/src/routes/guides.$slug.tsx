import { createFileRoute } from '@tanstack/react-router';
import { Guide } from '@/pages/Guide';

export const Route = createFileRoute('/guides/$slug')({
  component: Guide,
});
