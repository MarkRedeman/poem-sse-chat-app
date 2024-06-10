import { useFetcher } from "react-router-dom";
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

export function LoginForm() {
  const fetcher = useFetcher();

  return (
    <fetcher.Form method="POST" action="/">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Choose your username</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              defaultValue={"Mark"}
              id="username"
              name="username"
              type="text"
              required
              minLength={1}
              maxLength={256}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full">Sign in</Button>
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
