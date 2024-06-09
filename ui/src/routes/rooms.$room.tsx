import {
  redirect,
  json,
  Outlet,
  useParams,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "react-router-dom";
import { CornerDownLeft, Mic, Paperclip } from "lucide-react";
import { client } from "~/api/client";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Room } from "~/lib/rooms";
import { useLiveLoader } from "~/lib/use-live-loader";
import { loader as roomsClientLoader } from "./rooms";
import { useEffect } from "react";
import { useLoaderData, useRouteLoaderData } from "~/lib/use-loader-data";

export function ChatForm() {
  return (
    <form className="relative overflow-hidden rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring">
      <Label htmlFor="message" className="sr-only">
        Message
      </Label>
      <Textarea
        id="message"
        placeholder="Type your message here..."
        className="min-h-12 resize-none border-0 p-3 shadow-none focus-visible:ring-0"
        maxLength={1024}
      />
      <div className="flex items-center p-3 pt-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <Paperclip className="size-4" />
              <span className="sr-only">Attach file</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Attach File</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <Mic className="size-4" />
              <span className="sr-only">Use Microphone</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Use Microphone</TooltipContent>
        </Tooltip>
        <Button type="submit" size="sm" className="ml-auto gap-1.5">
          Send Message
          <CornerDownLeft className="size-3.5" />
        </Button>
      </div>
    </form>
  );
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
  if (params.roomId === undefined) {
    throw new Response("Not Found", { status: 404 });
  }

  console.log("getting room?", { params });
  const response = await client.GET("/rooms/{room_id}", {
    params: { path: { room_id: params.roomId } },
  });
  console.log("got room?", { params, response });

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
  }, [room, username]);
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
