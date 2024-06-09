import { QueryClient } from "@tanstack/react-query";
import {
  ActionFunction,
  LazyRouteFunction,
  LoaderFunction,
  RouteObject,
} from "react-router-dom";

export type AppContext = { queryClient: QueryClient };

export function lazy<
  R extends RouteObject & {
    buildLoader?: (context: AppContext) => LoaderFunction;
    buildAction?: (context: AppContext) => ActionFunction;
  },
>(
  importedPromise: Promise<R>,
  ctx: AppContext
): LazyRouteFunction<RouteObject> | undefined {
  // @ts-expect-error I'm not sure how  to fix this yet
  return async () => {
    const imported = await importedPromise;

    const loader =
      imported.buildLoader !== undefined
        ? imported.buildLoader(ctx)
        : imported.loader;

    const action =
      imported.buildAction !== undefined
        ? imported.buildAction(ctx)
        : imported.action;

    return { ...imported, loader, action };
  };
}
