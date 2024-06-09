import {
  ActionFunctionArgs,
  LoaderFunction,
  isRouteErrorResponse,
  useRouteError,
  redirect,
  NavLink,
} from "react-router-dom";
import { LoginForm, LogoutForm } from "~/components/login-form";
import { client } from "~/lib/api/client";
import { z } from "zod";
import { zx } from "zodix";
import { sessionQueryOptions } from "~/lib/session";
import { AppContext } from "~/router";

export const buildLoader = ({ queryClient }: AppContext): LoaderFunction => {
  return async () => {
    const query = sessionQueryOptions();
    const response = await queryClient.ensureQueryData(query);

    if (response.data) {
      return redirect("/rooms");
    }

    return response.data;
  };
};

const FormSchema = z.object({
  username: z.string().min(1, {
    message: "Username must be at least 1 character.",
  }),
});

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "DELETE") {
    await client.DELETE("/session");

    return redirect("/");
  }

  if (request.method === "POST") {
    const body = await zx.parseForm(request, FormSchema);

    await client.POST("/session", { body });

    return redirect("/rooms");
  }

  throw new Response("Not found", { status: 404 });
};

export function ErrorBoundary() {
  const error = useRouteError();

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

export default function Component() {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center gap-4">
      <h1>Logged in</h1>
      <LogoutForm />
    </div>
  );
}
