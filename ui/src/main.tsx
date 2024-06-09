import { ReactNode, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
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

function ErrorBoundary() {
  const error = useRouteError();
  console.log("there is an error", { error });

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

function Providers({ children }: { children?: ReactNode }) {
  const [eventSourceMap] = useState(
    new Map<string, { count: number; source: EventSource }>()
  );
  const [queryClient] = useState(new QueryClient());

  const router = createBrowserRouter([
    {
      path: "/",
      lazy: () => import("~/routes/_index"),
      ErrorBoundary,
    },
    {
      path: "/rooms",
      id: "routes/rooms",
      lazy: () => import("~/routes/rooms/layout"),
      children: [
        {
          index: true,
          lazy: () => import("~/routes/rooms/index"),
        },
        {
          path: ":roomId",
          id: "routes/rooms.$room",
          lazy: () => import("~/routes/rooms/room"),
          children: [
            {
              path: "messages",
              lazy: () => import("~/routes/rooms/messages"),
            },
          ],
        },
      ],
    },
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* The rest of your application */}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />

      <EventSourceProvider value={eventSourceMap}>
        <RouterProvider router={router} />
        {children}
      </EventSourceProvider>
    </QueryClientProvider>
  );
}

const container = document.getElementById("root")!;
const root = createRoot(container); // createRoot(container!) if you use TypeScript

root.render(<Providers />);
/* root.render(
 *   <React.StrictMode >
 *     <Providers />
 *   </React.StrictMode>
 * ); */
