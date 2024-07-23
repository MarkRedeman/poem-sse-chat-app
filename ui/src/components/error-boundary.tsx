import { ReactNode } from "react";
import { NavLink, isRouteErrorResponse, useRouteError } from "react-router-dom";

import { Button } from "./ui/button";

function BackButton() {
  return (
    <Button asChild>
      <NavLink to="/">Back</NavLink>
    </Button>
  );
}

function Header({ children }: { children: ReactNode }) {
  return <h1 className="text-2xl font-bold tracking-tight">{children}</h1>;
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.log("Layout", { error });

  if (isRouteErrorResponse(error)) {
    return (
      <div className="w-full h-screen flex flex-col gap-4 items-center justify-center">
        <Header>
          {error.status} {error.statusText}
        </Header>
        <p>{error.data}</p>
        <BackButton />
      </div>
    );
  } else if (error instanceof Error) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center p-32 min-width-0 overflow-x-scroll">
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-4">
            <Header>Error</Header>
            <p className="text-slate-700 text-sm">{error.message}</p>
          </div>
          <div className="flex flex-col gap-4">
            <pre className="text-xs text-slate-700 p-4 bg-slate-200 overflow-auto">
              {error.stack}
            </pre>
          </div>
          <BackButton />
        </div>
      </div>
    );
  } else {
    return (
      <div className="w-full h-screen flex flex-col gap-4 items-center justify-center">
        <Header>Unknown Error</Header>
        <BackButton />
      </div>
    );
  }
}
