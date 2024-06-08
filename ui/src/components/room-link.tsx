import { NavLink } from "@remix-run/react";
import { Room } from "~/lib/rooms";

export function RoomLink({ room, idx }: { room: Room; idx: number }) {
  const date = new Date(room.lastMessage.date);
  const text = date.toTimeString().split(" ")[0]?.slice(0, 5);

  return (
    <li>
      <NavLink
        to={`/rooms/${room.id}/messages`}
        className={({ isActive }) => {
          return `px-4 py-2 flex justify-between items-center rounded
           ${
             isActive
               ? "bg-green-300 p-8"
               : idx % 2 === 0
               ? "bg-zinc-100"
               : "bg-zinc-50"
           }`;
        }}
        unstable_viewTransition
      >
        {({ isActive, isPending, isTransitioning }) => (
          // TODO: add isPending state for when loading messages would be slow
          <>
            <div
              className={`flex flex-col ${
                isActive ? "text-green-800" : "text-slate-800"
              }`}
            >
              <strong>{room.name}</strong>
              <span className={isActive ? "text-green-700" : `text-slate-500`}>
                {room.lastMessage.content}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={`text-sm ${
                  room.unreadMessages > 0
                    ? "text-bold text-green-900"
                    : isActive
                    ? "text-green-700"
                    : "text-slate-500"
                }`}
              >
                {text}
              </span>
              <span
                className={`bg-green-500 rounded-full -1 text-xs text-green-900 font-bold w-6 h-6  flex justify-center items-center ${
                  isActive || room.unreadMessages === 0 ? "opacity-0" : ""
                }`}
              >
                {room.unreadMessages}
              </span>
            </div>
          </>
        )}
      </NavLink>
    </li>
  );
}
