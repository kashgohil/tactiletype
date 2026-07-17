import { createFileRoute } from '@tanstack/react-router';
import { MultiplayerRoom } from '../pages/MultiplayerRoom';

export const Route = createFileRoute('/multiplayer/room/$roomId')({
  component: MultiplayerRoom,
});
