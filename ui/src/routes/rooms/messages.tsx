import { ActionFunctionArgs, useParams } from "react-router-dom";
import { z } from "zod";
import { zx } from "zodix";
import { client } from "~/lib/api/client";

import { ChatForm } from "~/components/chat-form";
import { json } from "@remix-run/react";
import { roomQueryOptions } from "~/lib/rooms";
import { useSuspenseQuery } from "@tanstack/react-query";
import { sessionQueryOptions } from "~/lib/session";

const FormSchema = z.object({
  message: z.string().min(1, {
    message: "message must be at least 1 character.",
  }),
  id: z.string().uuid(),
});

export const action = async ({ request, params }: ActionFunctionArgs) => {
  if (request.method === "POST") {
    const body = await zx.parseForm(request, FormSchema);
    const room_id = params.roomId;

    if (room_id === undefined) {
      throw new Response("Not found", { status: 404 });
    }

    const now = new Date();
    await client.POST("/rooms/{room_id}/messages", {
      body: {
        ...body,
        send_at: now.toISOString(),
      },
      params: { path: { room_id } },
    });
    return json({ ok: true });
  }

  throw new Response("Not found", { status: 404 });
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
        <ol className="flex flex-col gap-3">
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
