import { createFileRoute } from '@tanstack/react-router';
import { Guides } from '@/pages/Guides';

export const Route = createFileRoute('/guides/')({
  component: Guides,
});
