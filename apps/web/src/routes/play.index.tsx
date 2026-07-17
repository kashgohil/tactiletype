import { createFileRoute } from '@tanstack/react-router';
import { Play } from '../pages/Play';

export const Route = createFileRoute('/play/')({
  component: Play,
});
