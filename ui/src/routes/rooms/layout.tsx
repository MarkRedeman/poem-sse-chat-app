import { json, redirect } from "@remix-run/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ActionFunction,
  ActionFunctionArgs,
  LoaderFunction,
  Outlet,
} from "react-router-dom";
import { z } from "zod";
import { zx } from "zodix";
import { CreateRoomButton } from "~/components/create-room-button";
import { Header } from "~/components/header";
import { RoomLinks } from "~/components/room-links";
import { client } from "~/lib/api/client";
import { roomQueryOptions, roomsQueryOptions } from "~/lib/rooms";
import { sessionQueryOptions } from "~/lib/session";
import { useLiveLoader } from "~/lib/use-live-loader";
import { AppContext } from "~/router";

const FormSchema = z.object({
  name: z.string().min(1, {
    message: "Group name must be at least 1 character.",
  }),
  id: z.string().uuid(),
});

type RoomIndex = {
  id: string;
  name: string;
  joined: boolean;
  lastMessage: null | { content: string; date: Date };
  unreadMessages: number;
};

export const buildAction = ({ queryClient }: AppContext): ActionFunction => {
  return async ({ request }: ActionFunctionArgs) => {
    if (request.method === "POST") {
      const { id, name } = await zx.parseForm(request, FormSchema);

      const now = new Date();
      const roomsQuery = roomsQueryOptions();
      const roomQuery = roomQueryOptions(id);
      await queryClient.cancelQueries({ queryKey: roomsQuery.queryKey });

      // Snapshot the previous value
      const previousRooms = queryClient.getQueryData<RoomIndex[]>(
        roomsQuery.queryKey
      );

      // Optimistically update to the new value
      const newRoom: RoomIndex = {
        id,
        name,
        joined: true,
        lastMessage: {
          content: "",
          date: new Date(),
        },
        unreadMessages: 0,
      };
      queryClient.setQueryData<RoomIndex[]>(roomsQuery.queryKey, (old) =>
        old !== undefined ? [...old, newRoom] : [newRoom]
      );

      queryClient.setQueryData(roomQuery.queryKey, {
        id,
        name,
        users: [],
        messages: [],
      });

      try {
        client.POST("/rooms", {
          body: { id, name, created_at: now.toISOString() },
        });

        queryClient.invalidateQueries(roomsQueryOptions());

        return redirect(`/rooms/${id}/messages`);
      } catch (e) {
        queryClient.setQueryData<RoomIndex[]>(
          roomsQuery.queryKey,
          previousRooms
        );

        throw e;
      }
    }

    throw new Response("Not found", { status: 404 });
  };
};

export const buildLoader = ({ queryClient }: AppContext): LoaderFunction => {
  return async () => {
    const [session, rooms] = await Promise.all([
      queryClient.ensureQueryData(sessionQueryOptions()),
      queryClient.ensureQueryData(roomsQueryOptions()),
    ]);

    return json({ rooms, username: session.username });
  };
};

export function Component() {
  const roomsQuery = useSuspenseQuery(roomsQueryOptions());
  const sessionQuery = useSuspenseQuery(sessionQueryOptions());

  useLiveLoader<ReturnType<typeof buildLoader>>(
    "http://localhost:3000/api/events"
  );

  return (
    <div className="w-full h-screen grid grid-cols-[400px_minmax(0,_1fr)]">
      <aside className="bg-zinc-200 py-8 px-4 flex flex-col gap-4 overflow-y-auto">
        <Header username={sessionQuery.data.username} />
        <div className="flex justify-between items-center">
          <h1 className="text-4xl my-4 mb-6 text-slate-800">Rooms</h1>
          <CreateRoomButton />
        </div>

        <RoomLinks rooms={roomsQuery.data} />
      </aside>

      <Outlet />
    </div>
  );
}
