import {
  Outlet,
  useParams,
  LoaderFunctionArgs,
  ActionFunctionArgs,
  useFetcher,
} from "react-router-dom";
import { client } from "~/lib/api/client";
import { useLiveLoader } from "~/lib/use-live-loader";
import { loader as roomsClientLoader } from "./layout";
import { useEffect } from "react";
import { useRouteLoaderData } from "~/lib/use-loader-data";
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

function JoinRoom({ roomId }: { roomId: string }) {
  const fetcher = useFetcher();
  useEffect(() => {
    fetcher.submit(
      { idle: true },
      { method: "post", action: `/rooms/${roomId}/users` }
    );
  }, []);

  return null;
}

export function Component() {
  const data = useLiveLoader<typeof loader>("http://localhost:3000/api/events");
  const room = data.room;
  const { username } =
    useRouteLoaderData<typeof roomsClientLoader>("routes/rooms")!;
  const { roomId } = useParams<{ roomId: string }>();

  return (
    <div className="flex flex-col gap-8 justify-between p-4 overflow-y-auto">
      <header className="flex flex-col justify-between items-start pb-4 gap-2 border-b">
        <h2>{room.name}</h2>
        <span className="text-xs">
          {room.users.includes(username) === false ? (
            <JoinRoom roomId={roomId!} />
          ) : null}
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
