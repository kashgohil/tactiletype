import { createFileRoute } from '@tanstack/react-router';
import { Practice } from '../pages/Practice';

export const Route = createFileRoute('/practice')({
  component: Practice,
});
