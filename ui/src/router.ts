import { QueryClient } from "@tanstack/react-query";
import {
  LazyRouteFunction,
  LoaderFunction,
  RouteObject,
} from "react-router-dom";

export type AppContext = { queryClient: QueryClient };

export function lazy<
  R extends RouteObject & {
    buildLoader?: (context: AppContext) => LoaderFunction;
  },
>(
  importedPromise: Promise<R>,
  { queryClient }: AppContext
): LazyRouteFunction<RouteObject> | undefined {
  // @ts-expect-error I'm not sure how  to fix this yet
  return async () => {
    const imported = await importedPromise;

    if (imported === undefined) {
      return undefined;
    }

    if (imported.buildLoader) {
      return {
        ...imported,
        loader: imported.buildLoader({ queryClient }),
      };
    }

    return imported;
  };
}
