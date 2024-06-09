import {
  useRouteLoaderData as useRouterRouteLoaderData,
  useLoaderData as useRouterLoaderData,
  useActionData as useRouterActionData,
} from "react-router-dom";
import {
  useLoaderData as useRemixLoaderData,
  useRouteLoaderData as useRemixRouteLoaderData,
  useActionData as useRemixActionData,
} from "@remix-run/react";

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
