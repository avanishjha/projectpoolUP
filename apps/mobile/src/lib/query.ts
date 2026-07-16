import { QueryClient } from '@tanstack/react-query';

/**
 * App-wide query defaults tuned for patchy Indian 4G (SRS §2.4):
 * generous staleTime so tab hops don't refetch, retries with backoff,
 * no refetch storms on focus.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0, // money-adjacent mutations must never auto-repeat
    },
  },
});
