import {
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from "@remix-run/react";
import styles from "./globals.css?url";
import { LinksFunction } from "@remix-run/node";
import { TooltipProvider } from "./components/ui/tooltip";
import { EventSourceProvider } from "./lib/use-event-source";
import { useEffect, useRef } from "react";
import { MyDB, doDatabaseStuff } from "./lib/idb";
import { IDBPDatabase } from "idb";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

const eventSourceMap = new Map<
  string,
  { count: number; source: EventSource }
>();

const queryClient = new QueryClient();

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

function useDb() {
  const dbRef = useRef<IDBPDatabase<MyDB>>();
  useEffect(() => {
    async function open() {
      const db = await doDatabaseStuff();
      const storeName = "rooms";

      const storeF = db.transaction(storeName).objectStore(storeName);

      //db.transaction(storeNames)
      console.log(storeF);

      dbRef.current = db;
    }

    open();
  }, []);

  return dbRef;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const db = useDb();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <link href="./globals.css" />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          {/* The rest of your application */}
          <ReactQueryDevtools
            initialIsOpen={false}
            buttonPosition="bottom-left"
          />

          <EventSourceProvider value={eventSourceMap}>
            <TooltipProvider>{children}</TooltipProvider>
          </EventSourceProvider>
        </QueryClientProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function HydrateFallback() {
  return <p>Loading...</p>;
}

export function ErrorBoundary() {
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
