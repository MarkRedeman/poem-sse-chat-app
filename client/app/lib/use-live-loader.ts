import { useLoaderData, useLocation, useRevalidator } from "@remix-run/react";
import { useEventSource } from "./use-event-source";
import { useEffect, useRef } from "react";

export function useLiveLoader<T>(
    dataResolver?: (revalidate: () => void) => void
) {
    const eventName = useLocation().pathname;
    const data = useEventSource(`/events/${eventName}`);
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
