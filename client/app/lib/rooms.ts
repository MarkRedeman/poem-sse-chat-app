import { v4 as uuid } from "uuid";

export type Room = {
    id: string;
    name: string;
    joined: boolean;
    unreadMessages: number;
    lastMessage: { content: string; date: number };
};

const today = new Date();

export const rooms: Room[] = [...new Array(25)].map((_, idx) => {
    const name = `Room ${idx}`;
    const id = uuid();
    return {
        id,
        name,
        joined: true,
        unreadMessages: Math.round(Math.random() * 100),
        lastMessage: {
            content: "Lorem ipsum dolar set amet",
            date: new Date(
                today.getTime() - Math.round(Math.random() * 20_000_000)
            ).getTime(),
        },
    };
});
