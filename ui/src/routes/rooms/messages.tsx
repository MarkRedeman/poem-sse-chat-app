import { json } from "@remix-run/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ActionFunction,
  ActionFunctionArgs,
  useParams,
} from "react-router-dom";
import { z } from "zod";
import { zx } from "zodix";
import { ChatForm } from "~/components/chat-form";
import { client } from "~/lib/api/client";
import { roomQueryOptions } from "~/lib/rooms";
import { sessionQueryOptions } from "~/lib/session";
import { AppContext } from "~/router";

const FormSchema = z.object({
  message: z.string().min(1, {
    message: "message must be at least 1 character.",
  }),
  id: z.string().uuid(),
});

type Message = {
  id: string;
  room_id: string;
  username: string;
  message: string;
  send_at: string;
};

type RoomData = {
  id: string;
  name: string;
  users: string[];
  messages: Message[];
};

export const buildAction = ({ queryClient }: AppContext): ActionFunction => {
  return async ({ request, params }: ActionFunctionArgs) => {
    if (request.method === "POST") {
      const body = await zx.parseForm(request, FormSchema);
      const roomId = params.roomId;

      if (roomId === undefined) {
        throw new Response("Not found", { status: 404 });
      }

      const roomQuery = roomQueryOptions(roomId);

      const previousSession = queryClient.getQueryData<{ username: string }>(
        sessionQueryOptions().queryKey
      );
      const username = previousSession!.username;
      const previousRoom = queryClient.getQueryData<RoomData>(
        roomQuery.queryKey
      );

      const now = new Date();

      try {
        client.POST("/rooms/{room_id}/messages", {
          body: {
            ...body,
            send_at: now.toISOString(),
          },
          params: { path: { room_id: roomId } },
        });

        queryClient.setQueryData<RoomData | undefined>(
          roomQuery.queryKey,
          (old) => {
            if (old === undefined) {
              return undefined;
            }

            return {
              ...old,
              messages: [
                ...old.messages,
                {
                  ...body,
                  room_id: roomId,
                  username,
                  send_at: now.toISOString(),
                },
              ],
            };
          }
        );

        queryClient.invalidateQueries({ queryKey: roomQuery.queryKey });

        return json({ ok: true });
      } catch (e) {
        queryClient.setQueryData<RoomData>(roomQuery.queryKey, previousRoom);
        throw e;
      }
    }

    throw new Response("Not found", { status: 404 });
  };
};

export function Component() {
  const { roomId } = useParams<{ roomId: string }>();
  const roomQuery = useSuspenseQuery(roomQueryOptions(roomId!));
  const messages = roomQuery.data.messages.map((message) => {
    return {
      username: message.username,
      message: message.message,
      date: new Date(),
    };
  });

  const sessionQuery = useSuspenseQuery(sessionQueryOptions());
  const username = sessionQuery.data.username;

  return (
    <>
      <main className="flex-1 overflow-y-auto flex flex-col justify-end overflow-y-auto">
        <ol className="flex flex-col gap-3" aria-label="Messages">
          {messages.map((message, idx) => {
            const isCurrentUser = message.username === username;

            return (
              <li
                className={`bg-zinc-100 p-2 rounded flex flex-col gap-1 ${
                  isCurrentUser ? "items-end" : ""
                }`}
                key={idx}
              >
                <span className="text-xs text-slate-600">
                  {message.username}
                </span>
                <p
                  className={`text-slate-700 text-sm ${
                    isCurrentUser ? "text-right" : ""
                  }`}
                >
                  {message.message}
                </p>
              </li>
            );
          })}
        </ol>
      </main>

      <ChatForm />
    </>
  );
}
