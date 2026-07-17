import { createFileRoute, Outlet } from '@tanstack/react-router';

/** Layout shell so /play and /play/$mode nest correctly. */
export const Route = createFileRoute('/play')({
  component: () => <Outlet />,
});
