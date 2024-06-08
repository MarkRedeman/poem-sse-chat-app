import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { EventSourceProvider } from "./lib/use-event-source";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { TooltipProvider } from "~/components/ui/tooltip.tsx";

const eventSourceMap = new Map<
  string,
  { count: number; source: EventSource }
>();
const queryClient = new QueryClient();
const router = createBrowserRouter([]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* The rest of your application */}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />

      <EventSourceProvider value={eventSourceMap}>
        <TooltipProvider>
          <RouterProvider router={router} />
          <App />
        </TooltipProvider>
      </EventSourceProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
