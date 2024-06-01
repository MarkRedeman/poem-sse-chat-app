import { Room } from "~/lib/rooms";
import { RoomLink } from "./room-link";

export function RoomLinks({ rooms }: { rooms: Room[] }) {
  const sortedRooms = rooms.sort((a, b) =>
    a.lastMessage.date > b.lastMessage.date ? -1 : 1
  );

  return (
    <ol className="flex flex-col gap-2">
      {sortedRooms.map((room, idx) => {
        return <RoomLink room={room} idx={idx} key={room.id} />;
      })}
    </ol>
  );
}
