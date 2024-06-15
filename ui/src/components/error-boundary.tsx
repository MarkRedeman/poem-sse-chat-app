import { NavLink, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { ReactNode } from "react";

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
      <div className="w-full h-screen flex flex-col gap-4 items-center justify-center">
        <Header>Error</Header>
        <p>{error.message}</p>
        <p>The stack trace is:</p>
        <pre>{error.stack}</pre>
        <BackButton />
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
