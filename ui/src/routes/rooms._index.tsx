import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { JoinRoomForm } from "~/components/join-room-form";

export default function Index() {
  return (
    <div className="grid grid-rows-[4fr_auto_5fr] justify-items-center w-full max-w-2xl mx-auto">
      <div className="row-start-2 row-end-3 flex flex-col gap-8 w-full max-w-[400px]">
        <JoinRoomForm />
      </div>
    </div>
  );
}
