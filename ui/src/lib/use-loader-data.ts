import {
  useRouteLoaderData as useRouterRouteLoaderData,
  useLoaderData as useRouterLoaderData,
} from "react-router-dom";
import {
  useLoaderData as useRemixLoaderData,
  useRouteLoaderData as useRemixRouteLoaderData,
} from "@remix-run/react";

// @ts-expect-error ignore
export const useLoaderData: typeof useRemixLoaderData = () => {
  return useRouterLoaderData();
};

// @ts-expect-error ignore
export const useRouteLoaderData: typeof useRemixRouteLoaderData = (route) => {
  return useRouterRouteLoaderData(route);
};
