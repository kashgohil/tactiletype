import { Footer } from '@/components/layout/Footer';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { Navbar } from '../components/layout/Navbar';

export const Route = createRootRoute({
  component: () => (
    <div className="h-screen w-full flex flex-col items-center overflow-y-auto">
      <Navbar />
      {/* `grow` (basis auto), not `flex-1` (basis 0) — with a zero basis the
          box is sized from leftover space and tall content spills past its
          padding, so the bottom gutter collapses against the footer. */}
      <main className="w-full max-w-shell mx-auto flex flex-col grow px-8 py-10">
        <Outlet />
      </main>
      <Footer />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </div>
  ),
});
