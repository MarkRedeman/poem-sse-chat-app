import { useLoaderData, useRevalidator } from "@remix-run/react";
import { useEventSource } from "./use-event-source";
import { useEffect, useRef } from "react";

export function useLiveLoader<T>(
  eventSourceUrl: string,
  dataResolver?: (revalidate: () => void) => void
) {
  const data = useEventSource(eventSourceUrl);
  const { revalidate } = useRevalidator();

  const resolver = useRef(dataResolver);
  useEffect(() => {
    resolver.current = dataResolver;
  }, [dataResolver]);

  useEffect(() => {
    if (resolver.current) {
      resolver.current(revalidate);
    } else {
      revalidate();
    }
  }, [data, revalidate]);

  return useLoaderData<T>();
}
