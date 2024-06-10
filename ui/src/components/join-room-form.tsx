import { useFetcher } from "react-router-dom";
import { v4 as uuid } from "uuid";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export function JoinRoomForm() {
  const fetcher = useFetcher();
  const id = uuid();

  return (
    <fetcher.Form method="POST" action="/rooms">
      <input type="hidden" name="id" value={id} />
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Join Room</CardTitle>
          <CardDescription>
            Create a new room or join a room from the list above
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
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
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full">
            Create & join room
          </Button>
        </CardFooter>
      </Card>
    </fetcher.Form>
  );
}

export function LogoutForm() {
  const fetcher = useFetcher();

  return (
    <fetcher.Form method="DELETE" action="/">
      <Button className="w-full">Logout</Button>
    </fetcher.Form>
  );
}
