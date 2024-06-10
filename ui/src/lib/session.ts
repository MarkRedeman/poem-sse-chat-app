import { queryOptions } from "@tanstack/react-query";

import { client } from "./api/client";

export const sessionQueryOptions = () => {
  return queryOptions({
    queryKey: ["session"],
    queryFn: async () => {
      const response = await client.GET("/session");

      if (response.response.status === 401 || response.data === undefined) {
        throw new Response("Unauthorized", { status: 401 });
      }

      return response.data;
    },
  });
};
