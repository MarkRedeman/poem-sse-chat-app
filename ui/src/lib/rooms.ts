import { queryOptions } from "@tanstack/react-query";

import { client } from "./api/client";

export type Room = {
  id: string;
  name: string;
  joined: boolean;
  unreadMessages: number;
  lastMessage: { content: string; date: Date };
};

export const roomsQueryOptions = () => {
  return queryOptions({
    queryKey: ["rooms"],
    queryFn: async () => {
      const response = await client.GET("/rooms");

      type X = typeof response.data;

      if (response.data === undefined) {
        throw response.response;
      }

      const rooms = response.data;
      return rooms.map((room) => {
        const lastMessage = room.last_message
          ? {
              content: room.last_message.message,
              date: new Date(room.last_message.send_at),
            }
          : { content: "hoi", date: new Date() };
        return {
          id: room.id,
          name: room.name,
          joined: true,
          lastMessage,
          unreadMessages: 0,
        };
      });
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

      if (response.data === undefined) {
        throw response.response;
      }

      return response.data;
    },
  });
};
