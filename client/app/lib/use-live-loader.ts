import { useLoaderData, useLocation, useRevalidator } from "@remix-run/react";
import { useEventSource } from "./use-event-source";
import { useEffect, useRef } from "react";

export function useLiveLoader<T>(
  eventSourceUrl: string,
  dataResolver?: (revalidate: () => void) => void
) {
  //const eventName = useLocation().pathname;
  const data = useEventSource(eventSourceUrl);
  console.log("Event source", data, JSON.parse(data));
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
