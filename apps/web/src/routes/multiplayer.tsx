import { createFileRoute, Outlet } from '@tanstack/react-router';

// Layout route: /multiplayer renders multiplayer.index, /multiplayer/room/$roomId
// renders the room through this outlet.
export const Route = createFileRoute('/multiplayer')({
  component: () => <Outlet />,
});
