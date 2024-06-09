import {
  ActionFunction,
  ActionFunctionArgs,
  LoaderFunction,
  Outlet,
} from "react-router-dom";
import { client } from "~/lib/api/client";
import { z } from "zod";
import { zx } from "zodix";

import { roomsQueryOptions } from "~/lib/rooms";
import { Header } from "~/components/header";
import { RoomLinks } from "~/components/room-links";
import { CreateRoomButton } from "~/components/create-room-button";
import { useLiveLoader } from "~/lib/use-live-loader";
import { json, redirect } from "@remix-run/react";
import { AppContext } from "~/router";
import { sessionQueryOptions } from "~/lib/session";
import { useSuspenseQuery } from "@tanstack/react-query";

const FormSchema = z.object({
  name: z.string().min(1, {
    message: "Group name must be at least 1 character.",
  }),
  id: z.string().uuid(),
});

export const buildAction = ({ queryClient }: AppContext): ActionFunction => {
  return async ({ request }: ActionFunctionArgs) => {
    if (request.method === "POST") {
      const { id, name } = await zx.parseForm(request, FormSchema);

      console.log("creating a room?");

      await client.POST("/rooms", {
        body: { id, name, created_at: "2024-06-09T12:00:00Z" },
      });

      console.log("doen creating room now redirecting");

      return redirect(`/rooms/${id}/messages`);
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
    <div className="w-full h-screen grid grid-cols-[400px_1fr] ">
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
