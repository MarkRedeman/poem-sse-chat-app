import { v4 as uuid } from "uuid";
import { queryOptions } from "@tanstack/react-query";
import { client } from "./api/client";

export type Room = {
  id: string;
  name: string;
  joined: boolean;
  unreadMessages: number;
  lastMessage: { content: string; date: number };
};

const today = new Date();

export const rooms: Room[] = [...new Array(25)].map((_, idx) => {
  const name = `Room ${idx}`;
  const id = uuid();
  return {
    id,
    name,
    joined: true,
    unreadMessages: Math.round(Math.random() * 100),
    lastMessage: {
      content: "Lorem ipsum dolar set amet",
      date: new Date(
        today.getTime() - Math.round(Math.random() * 20_000_000)
      ).getTime(),
    },
  };
});

export const roomsQueryOptions = () => {
  return queryOptions({
    queryKey: ["rooms"],
    queryFn: async () => {
      const response = await client.GET("/rooms");

      if (response === undefined) {
        throw new Response("Not found", { status: 404 });
      }

      return response.data;
    },
  });
};

export const roomQueryOptions = (roomId: string) => {
  return queryOptions({
    queryKey: ["rooms", roomId],
    queryFn: async () => {
      const response = await client.GET("/rooms/{room_id}", {
        params: { path: { room_id: roomId } },
      });

      return response.data;
    },
  });
};
