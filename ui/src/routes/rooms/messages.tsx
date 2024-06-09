import {
  Form,
  useSubmit,
  useNavigation,
  ActionFunctionArgs,
} from "react-router-dom";
import { CornerDownLeft } from "lucide-react";
import { z } from "zod";
import { zx } from "zodix";
import { client } from "~/lib/api/client";
import { v4 as uuid } from "uuid";

import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { loader as roomsClientLoader } from "./layout";
import { loader as roomClientLoader } from "./room";
import { KeyboardEventHandler, useEffect, useRef } from "react";
import { useActionData, useRouteLoaderData } from "~/lib/use-loader-data";
import { json } from "@remix-run/react";

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

    await client.POST("/rooms/{room_id}/messages", {
      body,
      params: { path: { room_id } },
    });
    return json({ ok: true });
  }

  throw new Response("Not found", { status: 404 });
};

function ChatForm() {
  const id = uuid();
  const submit = useSubmit();
  const $form = useRef<HTMLFormElement>(null);

  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();

  useEffect(
    function resetFormOnSuccess() {
      if (navigation.state === "idle" && actionData?.ok) {
        $form.current?.reset();
      }
    },
    [navigation.state, actionData]
  );

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    const pressedSubmit =
      event.key === "Enter" && (event.shiftKey || event.ctrlKey);

    if (!pressedSubmit) {
      return;
    }

    event.preventDefault();
    const form = event.currentTarget.form;

    if (!form) {
      return;
    }

    // Submit and clear the form
    submit(form);
    form.reset();
  };

  return (
    <Form
      ref={$form}
      method="POST"
      className="relative overflow-hidden rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring"
    >
      <input type="hidden" name="id" value={id} />
      <Label htmlFor="message" className="sr-only">
        Message
      </Label>
      <Textarea
        id="message"
        name="message"
        placeholder="Type your message here..."
        className="min-h-12 resize-none border-0 p-3 shadow-none focus-visible:ring-0"
        maxLength={1024}
        minLength={1}
        onKeyDown={handleKeyDown}
      />
      <div className="flex items-center p-3 pt-0">
        <Button type="submit" size="sm" className="ml-auto gap-1.5">
          Send Message
          <CornerDownLeft className="size-3.5" />
        </Button>
      </div>
    </Form>
  );
}

export function Component() {
  const data = useRouteLoaderData<typeof roomsClientLoader>("routes/rooms")!;
  const roomData =
    useRouteLoaderData<typeof roomClientLoader>("routes/rooms.$room")!;
  const username = data.username;

  const messages = roomData.room.messages.map((message) => {
    return {
      username: message.username,
      message: message.message,
      date: new Date(),
    };
  });

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