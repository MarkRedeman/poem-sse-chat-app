import {
  Outlet,
  useParams,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "react-router-dom";
import { client } from "~/api/client";
import { useLiveLoader } from "~/lib/use-live-loader";
import { loader as roomsClientLoader } from "./rooms";
import { useEffect } from "react";
import { useLoaderData, useRouteLoaderData } from "~/lib/use-loader-data";
import { json, redirect } from "@remix-run/react";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  if (params.roomId === undefined) {
    throw new Response("Not Found", { status: 404 });
  }

  const response = await client.GET("/rooms/{room_id}", {
    params: { path: { room_id: params.roomId } },
  });

  const room = response.data;

  if (room === undefined) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ room });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "POST") {
    //await client.POST("/session");

    return redirect("/rooms");
  }

  throw new Response("Not found", { status: 404 });
};

function useJoinRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const { username } =
    useRouteLoaderData<typeof roomsClientLoader>("routes/rooms")!;

  const { room } = useLoaderData<typeof loader>();

  useEffect(() => {
    if (room.users.includes(username) || roomId === undefined) {
      return;
    }

    client.POST("/rooms/{room_id}/users", {
      params: { path: { room_id: roomId } },
    });
  }, [room, username, roomId]);
}

export function Component() {
  const data = useLiveLoader<typeof loader>("http://localhost:3000/api/events");
  const room = data.room;
  useJoinRoom();

  return (
    <div className="flex flex-col gap-8 justify-between p-4 overflow-y-auto">
      <header className="flex flex-col justify-between items-start pb-4 gap-2 border-b">
        <h2>{room.name}</h2>
        <span className="text-xs">
          <ul className="flex gap-2">
            {room.users.map((user, idx) => {
              return <li key={idx}>{user}</li>;
            })}
          </ul>
        </span>
      </header>

      <Outlet />
    </div>
  );
}
