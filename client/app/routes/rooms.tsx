import type { MetaFunction } from "@remix-run/node";
import {
  ClientActionFunctionArgs,
  useLoaderData,
  redirect,
  json,
  Outlet,
  useRouteLoaderData,
  useMatches,
  useRevalidator,
  useLocation,
} from "@remix-run/react";
import { client } from "~/api";
import { z } from "zod";
import { zx } from "zodix";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Room, rooms } from "~/lib/rooms";
import { Header } from "~/components/header";
import { RoomLinks } from "~/components/room-links";
import { CreateRoomButton } from "~/components/create-room-button";
import { useEffect } from "react";

const FormSchema = z.object({
  name: z.string().min(1, {
    message: "Group name must be at least 1 character.",
  }),
  id: z.string().uuid(),
});

export const clientAction = async ({ request }: ClientActionFunctionArgs) => {
  if (request.method === "POST") {
    const { id, name } = await zx.parseForm(request, FormSchema);

    await client.POST("/rooms", { body: { id, name } });

    // TMP loal state
    rooms.push({
      id,
      name,
      joined: true,
      lastMessage: { content: "No message", date: new Date().getTime() },
      unreadMessages: 0,
    });

    return redirect(`/rooms/${id}/messages`);
  }

  throw new Response("Not found", { status: 404 });
};

export const clientLoader = async () => {
  const sessionResponse = await client.GET("/session");

  if (sessionResponse.data === undefined) {
    return redirect("/");
  }

  const roomsResponse = await client.GET("/rooms");
  if (roomsResponse.error) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({
    rooms: roomsResponse.data.map((room): Room => {
      return {
        id: room.id,
        name: room.name,
        joined: true,
        lastMessage: { content: "hoi", date: new Date().getTime() },
        unreadMessages: 0,
      };
    }),
    username: sessionResponse.data.username,
  });
};

export const meta: MetaFunction = () => {
  return [{ title: "Rooms" }, { name: "description", content: "Chat" }];
};

export default function Index() {
  const data = useLoaderData<typeof clientLoader>();
  const user = useRouteLoaderData("routes/rooms");
  const matches = useMatches();

  const username = data?.username ?? "Mark";
  const rooms = data.rooms;

  console.log({ data, user, matches });

  return (
    <div className="w-full h-screen grid grid-cols-[400px_1fr] ">
      <aside className="bg-zinc-200 py-8 px-4 flex flex-col gap-4 overflow-y-auto">
        <Header username={username} />
        <div className="flex justify-between items-center">
          <h1 className="text-4xl my-4 mb-6 text-slate-800">Rooms</h1>
          <CreateRoomButton />
        </div>

        <RoomLinks rooms={rooms} />
      </aside>

      <Outlet />
    </div>
  );
}
