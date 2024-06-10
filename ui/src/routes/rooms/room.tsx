import { json, redirect } from "@remix-run/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  ActionFunctionArgs,
  LoaderFunction,
  Outlet,
  useFetcher,
  useParams,
} from "react-router-dom";
import { API_URL } from "~/lib/api/client";
import { roomQueryOptions } from "~/lib/rooms";
import { sessionQueryOptions } from "~/lib/session";
import { useLiveLoader } from "~/lib/use-live-loader";
import { AppContext } from "~/router";

export const buildLoader = ({ queryClient }: AppContext): LoaderFunction => {
  return async ({ params }) => {
    const roomId = params.roomId;
    if (roomId === undefined) {
      throw new Response("Not Found", { status: 404 });
    }

    const room = await queryClient.ensureQueryData(roomQueryOptions(roomId));

    if (room === undefined) {
      throw new Response("Not Found", { status: 404 });
    }

    return json({ room });
  };
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
  useLiveLoader(`${API_URL}/events`);

  const { roomId } = useParams<{ roomId: string }>();
  const roomQuery = useSuspenseQuery(roomQueryOptions(roomId!));
  const room = roomQuery.data;

  const sessionQuery = useSuspenseQuery(sessionQueryOptions());
  const username = sessionQuery.data.username;

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
