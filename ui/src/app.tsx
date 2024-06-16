import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

import { ErrorBoundary } from "./components/error-boundary";
import { EventSourceProvider } from "./lib/use-event-source";
import { lazy } from "./router";

export function App() {
  const [eventSourceMap] = useState(
    new Map<string, { count: number; source: EventSource }>()
  );
  const [queryClient] = useState(
    new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: 60 * 1000,
          staleTime: 60 * 1000,
          retry: (_, error) => {
            const response = error;
            if (response instanceof Response) {
              if (response.status >= 400 && response.status < 500) {
                return false;
              }
            }

            return true;
          },
        },
      },
    })
  );

  const router = createBrowserRouter([
    {
      path: "/",
      lazy: lazy(import("~/routes/_index"), { queryClient }),
    },
    {
      path: "/rooms",
      id: "routes/rooms",
      ErrorBoundary,
      lazy: lazy(import("~/routes/rooms/layout"), { queryClient }),
      children: [
        {
          ErrorBoundary,
          children: [
            {
              index: true,
              lazy: lazy(import("~/routes/rooms/index"), { queryClient }),
            },
            {
              path: ":roomId",
              id: "routes/rooms.$room",
              lazy: lazy(import("~/routes/rooms/room"), { queryClient }),
              children: [
                {
                  path: "messages",
                  lazy: lazy(import("~/routes/rooms/messages"), {
                    queryClient,
                  }),
                },
                {
                  path: "users",
                  lazy: lazy(import("~/routes/rooms/users"), { queryClient }),
                },
              ],
            },
          ],
        },
      ],
    },
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <EventSourceProvider value={eventSourceMap}>
        <RouterProvider router={router} />
      </EventSourceProvider>

      {/* The rest of your application */}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
