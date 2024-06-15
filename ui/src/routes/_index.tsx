import { redirect } from "@remix-run/react";
import {
  ActionFunction,
  ActionFunctionArgs,
  LoaderFunction,
  Navigate,
  isRouteErrorResponse,
  useRouteError,
} from "react-router-dom";
import { z } from "zod";
import { zx } from "zodix";
import { ErrorBoundary as DefaultErrorBoundary } from "~/components/error-boundary";
import { LoginForm } from "~/components/login-form";
import { client } from "~/lib/api/client";
import { sessionQueryOptions } from "~/lib/session";
import { AppContext } from "~/router";

export const buildLoader = ({ queryClient }: AppContext): LoaderFunction => {
  return async () => {
    const query = sessionQueryOptions();
    const response = await queryClient.ensureQueryData(query);

    if (response) {
      return redirect("/rooms");
    }

    return response;
  };
};

const FormSchema = z.object({
  username: z.string().min(1, {
    message: "Username must be at least 1 character.",
  }),
});

export const buildAction = ({ queryClient }: AppContext): ActionFunction => {
  return async ({ request }: ActionFunctionArgs) => {
    if (request.method === "DELETE") {
      await client.DELETE("/session");
      queryClient.removeQueries();

      return redirect("/");
    }

    if (request.method === "POST") {
      const body = await zx.parseForm(request, FormSchema);

      await client.POST("/session", { body });

      return redirect("/rooms");
    }

    throw new Response("Not found", { status: 404 });
  };
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
  }

  return <DefaultErrorBoundary />;
}

export function Component() {
  return <Navigate to="/rooms" />;
}
