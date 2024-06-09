import { useState } from "react";
import { EventSourceProvider } from "./lib/use-event-source";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createBrowserRouter,
  isRouteErrorResponse,
  NavLink,
  RouterProvider,
  useRouteError,
} from "react-router-dom";
import { lazy } from "./router";

function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>
          {error.status} {error.statusText}
        </h1>
        <p>{error.data}</p>
        <NavLink to="/">Back</NavLink>
      </div>
    );
  } else if (error instanceof Error) {
    return (
      <div>
        <h1>Error</h1>
        <p>{error.message}</p>
        <p>The stack trace is:</p>
        <pre>{error.stack}</pre>
        <NavLink to="/">Back</NavLink>
      </div>
    );
  } else {
    return (
      <>
        <h1>Unknown Error</h1>
        <NavLink to="/">Back</NavLink>
      </>
    );
  }
}

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
            if (error instanceof Response) {
              if (error.status === 404 || error.status === 401) {
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
          index: true,
          ErrorBoundary,
          lazy: lazy(import("~/routes/rooms/index"), { queryClient }),
        },
        {
          path: ":roomId",
          id: "routes/rooms.$room",
          ErrorBoundary,
          lazy: lazy(import("~/routes/rooms/room"), { queryClient }),
          children: [
            {
              path: "messages",
              lazy: lazy(import("~/routes/rooms/messages"), { queryClient }),
            },
            {
              path: "users",
              lazy: lazy(import("~/routes/rooms/users"), { queryClient }),
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