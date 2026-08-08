import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, ThemeProvider } from './contexts';
// Import the generated route tree
import { routeTree } from './routeTree.gen';
import { describeError } from './utils/describeError';

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /**
       * Set when a mutation reports its own failures. "That didn't save" is
       * wrong for anything that isn't a write — a download, say — and two
       * toasts for one error is worse than the wrong words.
       */
      ownsErrorToast?: boolean;
    };
  }
}

const queryClient = new QueryClient({
  // Every write gets a voice by default. A mutation that wants its own wording
  // opts out with meta.ownsErrorToast and handles onError itself.
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.ownsErrorToast) return;
      toast.error("That didn't save", { description: describeError(error) });
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Create a new router instance
const router = createRouter({ routeTree, context: { queryClient } });

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
