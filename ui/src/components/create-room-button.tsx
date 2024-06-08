import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useFetcher } from "@remix-run/react";
import { v4 as uuid } from "uuid";
import { useState } from "react";

export function CreateRoomButton() {
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher();
  const id = uuid();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Create room</Button>
      </DialogTrigger>
      <input type="hidden" name="id" value={id} />
      <DialogContent className="sm:max-w-[425px]">
        <fetcher.Form
          method="POST"
          action="/rooms"
          className=" grid gap-4"
          onSubmit={() => {
            setOpen(false);
          }}
        >
          <input type="hidden" name="id" value={id} />
          <DialogHeader>
            <DialogTitle>Create a new room</DialogTitle>
            <DialogDescription>
              Create a new room or join a room from the list above
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="name">Room name</Label>
            <Input
              defaultValue={"S[ck]rip(t|t?c)ie In[ck]"}
              id="name"
              name="name"
              type="text"
              required
              minLength={1}
              maxLength={256}
            />
          </div>

          <DialogFooter>
            <Button type="submit">Create & join room</Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
