import { Footer } from '@/components/layout/Footer';
import { Seo } from '@/components/Seo';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { Navbar } from '../components/layout/Navbar';

export const Route = createRootRoute({
  // `min-h-svh`, NOT `h-screen` + `overflow-y-auto`. A fixed-height flex column
  // is a trap here: `main` keeps the default `flex-shrink: 1`, so on any page
  // taller than the viewport it gets squeezed down to its min-height, its
  // content spills out of the box, and the footer is laid out right after that
  // squeezed box — hanging in the middle of the page. Letting the document
  // scroll means nothing shrinks and the footer always lands after the content.
  component: () => (
    <div className="min-h-svh w-full flex flex-col">
      <Seo />
      <Navbar />
      {/* `grow` (basis auto), not `flex-1` (basis 0) — with a zero basis the
          box is sized from leftover space and tall content spills past its
          padding, so the bottom gutter collapses against the footer.
          `shrink-0` so main can never be compressed below its content.
          `screen-fill` is what keeps the footer off the first screen: main is
          always at least a viewport tall, so the footer has to be scrolled to
          on every route the way it already was on the test and results. */}
      <main className="screen-fill w-full max-w-shell mx-auto flex flex-col grow shrink-0 px-8 py-10">
        <Outlet />
      </main>
      <Footer />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </div>
  ),
});
