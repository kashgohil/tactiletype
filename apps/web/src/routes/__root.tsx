import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { Navbar } from '../components/layout/Navbar';

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-1">
        <Outlet />
      </main>
      <TanStackRouterDevtools />
    </div>
  ),
});
