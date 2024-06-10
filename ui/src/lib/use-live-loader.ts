import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useRevalidator } from "react-router-dom";

import { useEventSource } from "./use-event-source";
import { useLoaderData } from "./use-loader-data";

const wait = (n: number) => new Promise((resolve) => setTimeout(resolve, n));

export function useLiveLoader<T>(
  eventSourceUrl: string,
  dataResolver?: (revalidate: () => void) => void
) {
  //return useLoaderData<T>();
  const queryClient = useQueryClient();
  const data = useEventSource(eventSourceUrl);
  const { revalidate } = useRevalidator();

  const resolver = useRef(dataResolver);
  useEffect(() => {
    resolver.current = dataResolver;
  }, [dataResolver]);

  useEffect(() => {
    try {
      const event = JSON.parse(data ?? "{}");
      console.log("Got event", data, event);

      if (event?.type === "UserLoggedOut") {
        queryClient.cancelQueries();
        queryClient.clear();
        return;
      }
    } catch (e) {
      console.log("wasnt able to parse event", data);
    }

    console.log("Received the event..");

    // Add a bit of throttling so that we can focus on optimistic updates next..
    wait(10).then(() => {
      if (resolver.current) {
        resolver.current(revalidate);
      } else {
        queryClient.refetchQueries();
        // queryClient
        //   .invalidateQueries({
        //     queryKey: ["rooms"],
        //     exact: false,
        //     stale: true,
        //     refetchType: "all",
        //   })
        //   .then(() => {
        //     revalidate();
        //   });
      }
    });
  }, [data, revalidate]);

  return useLoaderData<T>();
}
