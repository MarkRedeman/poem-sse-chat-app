import { LogoutForm } from "./login-form";

export function Header({ username }: { username: string }) {
  return (
    <header className="flex justify-between items-center pb-4 border-b">
      <span>Hi, {username}</span>

      <LogoutForm />
    </header>
  );
}
