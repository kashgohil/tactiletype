import { createFileRoute, Outlet } from '@tanstack/react-router';

/** Layout shell so /guides and /guides/$slug nest correctly. */
export const Route = createFileRoute('/guides')({
  component: () => <Outlet />,
});
