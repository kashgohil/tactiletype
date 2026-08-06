import { Guides } from '@/pages/Guides';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/guides/')({
  component: Guides,
});
