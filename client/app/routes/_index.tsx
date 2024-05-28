import type { MetaFunction } from "@remix-run/node";
import {
  ClientActionFunctionArgs,
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
  redirect,
} from "@remix-run/react";
import { LoginForm, LogoutForm } from "~/components/login-form";
import { client } from "~/api";
import { z } from "zod";
import { zx } from "zodix";

export const clientLoader = async () => {
  const response = await fetch("http://localhost:3000/api/session", {
    credentials: "include",
  });

  if (response.status === 401) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return await response.json();
};

const FormSchema = z.object({
  username: z.string().min(1, {
    message: "Username must be at least 1 character.",
  }),
});

export const clientAction = async ({ request }: ClientActionFunctionArgs) => {
  if (request.method === "DELETE") {
    await client.DELETE("/session");

    return redirect("/");
  }

  if (request.method === "POST") {
    const body = await zx.parseForm(request, FormSchema);

    await client.POST("/session", { body });

    return redirect("/");
  }

  throw new Response("Not found", { status: 404 });
};

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix SPA" },
    { name: "description", content: "Welcome to Remix (SPA Mode)!" },
  ];
};

export function ErrorBoundary() {
  const error = useRouteError();
  console.log("there is an error", { error });

  if (isRouteErrorResponse(error)) {
    if (error.status === 401) {
      return (
        <div className="w-full h-screen flex items-center justify-center">
          <LoginForm />
        </div>
      );
    }

    return (
      <div>
        <h1>
          {error.status} {error.statusText}
        </h1>
        <p>{error.data}</p>
      </div>
    );
  } else if (error instanceof Error) {
    return (
      <div>
        <h1>Error</h1>
        <p>{error.message}</p>
        <p>The stack trace is:</p>
        <pre>{error.stack}</pre>
      </div>
    );
  } else {
    return <h1>Unknown Error</h1>;
  }
}

export default function Index() {
  const data = useLoaderData();

  console.log("Data", { data });

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center gap-4">
      <h1>Logged in</h1>
      <LogoutForm />
    </div>
  );
}
