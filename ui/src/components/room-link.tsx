import { useQueryClient } from "@tanstack/react-query";
import { NavLink } from "react-router-dom";
import { Room, roomQueryOptions } from "~/lib/rooms";

function usePrefetchRoom() {
  const queryClient = useQueryClient();

  return (roomId: string) => {
    queryClient.prefetchQuery(roomQueryOptions(roomId));
  };
}

export function RoomLink({ room, idx }: { room: Room; idx: number }) {
  const date = new Date(room.lastMessage.date);
  const text = date.toTimeString().split(" ")[0]?.slice(0, 5);
  const prefetchRoom = usePrefetchRoom();

  return (
    <li aria-labelledby={`room-${room.id}-name`}>
      <NavLink
        to={`/rooms/${room.id}/messages`}
        onPointerEnter={() => {
          prefetchRoom(room.id);
        }}
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
        {({ isActive }) => (
          <>
            <div
              className={`flex flex-col ${
                isActive ? "text-green-800" : "text-slate-800"
              }`}
            >
              <strong id={`room-${room.id}-name`}>{room.name}</strong>
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
