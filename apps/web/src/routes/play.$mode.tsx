import { createFileRoute } from '@tanstack/react-router';
import { PlayMode } from '../pages/PlayMode';

export const Route = createFileRoute('/play/$mode')({
  component: PlayMode,
});
