import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useRevalidator } from "react-router-dom";

import { sessionQueryOptions } from "./session";
import { useEventSource } from "./use-event-source";
import { useLoaderData } from "./use-loader-data";

const wait = (n: number) => new Promise((resolve) => setTimeout(resolve, n));

function debounce<F extends (...args: Parameters<F>) => ReturnType<F>>(
  func: F,
  waitFor: number
) {
  let timeout: ReturnType<typeof setTimeout>;

  const debounced = (...args: Parameters<F>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced;
}

export function useLiveLoader<T>(
  eventSourceUrl: string,
  dataResolver?: (revalidate: () => void) => void
) {
  const sessionQuery = useSuspenseQuery(sessionQueryOptions());
  //return useLoaderData<T>();
  const queryClient = useQueryClient();
  const data = useEventSource(eventSourceUrl);
  const { revalidate } = useRevalidator();

  const resolver = useRef(dataResolver);
  useEffect(() => {
    resolver.current = dataResolver;
  }, [dataResolver]);

  const debouncedRefresh = useRef(
    debounce(() => {
      if (resolver.current) {
        resolver.current(revalidate);
      } else {
        queryClient.refetchQueries();
      }
    }, 100)
  );

  useEffect(() => {
    try {
      const event = JSON.parse(data ?? "{}");
      console.log("Got event", data, event);

      // data: {"payload":{"type":"UserLoggedOut","username":"Mark - firefox"},"type":"UserLoggedOut"}

      if (event?.type === "UserLoggedOut") {
        const username = event.payload.username;

        console.log({ username });

        if (username === sessionQuery.data.username) {
          console.log("logging out", { username, sessionQuery });
          queryClient.cancelQueries();
          queryClient.clear();
        }
        return;
      }
    } catch (e) {
      console.log("wasnt able to parse event", data);
    }

    console.log("Received the event..");

    // Add a bit of throttling so that we can focus on optimistic updates next..
    debouncedRefresh.current();
  }, [data, revalidate]);

  return useLoaderData<T>();
}
