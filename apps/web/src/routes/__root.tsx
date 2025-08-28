import { Footer } from '@/components/layout/Footer';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { Navbar } from '../components/layout/Navbar';

export const Route = createRootRoute({
  component: () => (
    <div className="h-screen w-full flex flex-col items-center overflow-y-auto">
      <Navbar />
      <main className="container flex flex-col flex-1 px-8">
        <Outlet />
      </main>
      <Footer />
      <TanStackRouterDevtools />
    </div>
  ),
});
