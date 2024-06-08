import React, { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { EventSourceProvider } from "./lib/use-event-source";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { TooltipProvider } from "~/components/ui/tooltip.tsx";

const eventSourceMap = new Map<
  string,
  { count: number; source: EventSource }
>();
const queryClient = new QueryClient();
const router = createBrowserRouter([
  {
    path: "/",
    lazy: () => import("~/routes/_index"),
    /* element: <div>Hello world!</div>,
     * children: [], */
  },
  {
    path: "/rooms",
    id: "routes/rooms",
    lazy: () => import("~/routes/rooms"),
    children: [
      {
        index: true,
        lazy: () => import("~/routes/rooms._index"),
      },
      {
        path: ":roomId",
        id: "routes/rooms.$room",
        lazy: () => import("~/routes/rooms.$room"),
        children: [
          {
            path: "messages",
            lazy: () => import("~/routes/rooms.$room.messages"),
          },
        ],
      },
    ],
  },
]);

function Providers({ children }: { children?: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* The rest of your application */}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />

      <EventSourceProvider value={eventSourceMap}>
        <TooltipProvider>
          <RouterProvider router={router} />
          {children}
        </TooltipProvider>
      </EventSourceProvider>
    </QueryClientProvider>
  );
}

const container = document.getElementById("root")!;
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(
  <React.StrictMode>
    <Providers />
  </React.StrictMode>
);
