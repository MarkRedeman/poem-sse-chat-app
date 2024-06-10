import {
  useActionData as useRemixActionData,
  useLoaderData as useRemixLoaderData,
  useRouteLoaderData as useRemixRouteLoaderData,
} from "@remix-run/react";
import {
  useActionData as useRouterActionData,
  useLoaderData as useRouterLoaderData,
  useRouteLoaderData as useRouterRouteLoaderData,
} from "react-router-dom";

export const useLoaderData = <T>(): ReturnType<
  typeof useRemixLoaderData<T>
> => {
  // @ts-expect-error ignore
  return useRouterLoaderData();
};

export const useRouteLoaderData = <T>(
  route: string
): ReturnType<typeof useRemixRouteLoaderData<T>> => {
  // @ts-expect-error ignore
  return useRouterRouteLoaderData(route);
};

export const useActionData = <T>(): ReturnType<
  typeof useRemixActionData<T>
> => {
  // @ts-expect-error ignore
  return useRouterActionData();
};
