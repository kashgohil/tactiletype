import { Toaster } from '@/components/ui/sonner';
import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import { AuthProvider, ThemeProvider } from './contexts';
import { describeError } from './utils/describeError';

// Import the generated route tree
import { routeTree } from './routeTree.gen';

const queryClient = new QueryClient({
  // Every write gets a voice by default. A mutation that wants its own wording
  // can still add onError — this runs alongside it, not instead of it.
  mutationCache: new MutationCache({
    onError: (error) => {
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
