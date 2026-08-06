import { Guide } from '@/pages/Guide';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/guides/$slug')({
  component: Guide,
});
