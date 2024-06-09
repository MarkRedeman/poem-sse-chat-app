import { Form, useSubmit, useNavigation } from "react-router-dom";
import { CornerDownLeft } from "lucide-react";
import { v4 as uuid } from "uuid";

import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { KeyboardEventHandler, useEffect, useRef } from "react";
import { useActionData } from "~/lib/use-loader-data";
import { action } from "~/routes/rooms/messages";

export function ChatForm() {
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
