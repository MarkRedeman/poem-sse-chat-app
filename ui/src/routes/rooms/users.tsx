import { json } from "@remix-run/react";
import { ActionFunctionArgs } from "react-router-dom";
import { client } from "~/lib/api/client";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  if (request.method === "POST") {
    const roomId = params.roomId;

    if (roomId === undefined) {
      throw new Response("Not found", { status: 404 });
    }

    const now = new Date();
    await client.POST("/rooms/{room_id}/users", {
      params: { path: { room_id: roomId } },
      body: {
        joined_at: now.toISOString(),
      },
    });

    return json({ ok: true });
  }

  throw new Response("Not found", { status: 404 });
};

export function Component() {
  return (
    <main className="flex-1 overflow-y-auto flex flex-col justify-end overflow-y-auto">
      hoi
    </main>
  );
}
