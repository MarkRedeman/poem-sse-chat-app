import { json, redirect, useRouteLoaderData } from "@remix-run/react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { rooms } from "~/lib/rooms";
import { JoinRoomForm } from "~/components/join-room-form";
import { client } from "~/api";

export default function Index() {
  const user = useRouteLoaderData("routes/rooms");
  console.log({ user });

  return (
    <div className="grid grid-rows-[4fr_auto_5fr] justify-items-center w-full max-w-2xl mx-auto">
      <div className="row-start-2 row-end-3 flex flex-col gap-8 w-full max-w-[400px]">
        <JoinRoomForm />
      </div>
    </div>
  );
}
