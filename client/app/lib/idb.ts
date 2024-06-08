import { openDB, deleteDB, wrap, unwrap, DBSchema } from "idb";
import { v4 as uuid } from "uuid";

export interface MyDB extends DBSchema {
  rooms: {
    key: string;
    value: {
      id: string;
      name: string;
      joined: boolean;
    };
    indexes: { name: string };
  };
  messages: {
    key: string;
    value: {
      id: string;
      room_id: string;
      username: string;
      message: string;
      date: Date;
    };
    indexes: { room_id: string };
  };

  "favourite-number": {
    key: string;
    value: number;
  };
  products: {
    value: {
      name: string;
      price: number;
      productCode: string;
    };
    key: string;
    indexes: { "by-price": number };
  };
}

export async function doDatabaseStuff() {
  const db = await openDB<MyDB>("chat-sse", 1, {
    async upgrade(database, oldVersion, newVersion, transaction, event) {
      const storeName = "rooms";

      const store = database.createObjectStore(storeName, {
        keyPath: "id",
        autoIncrement: false,
      });
      store.createIndex("name", "name");

      const messagesStore = database.createObjectStore("messages", {
        keyPath: "id",
        autoIncrement: false,
      });
      messagesStore.createIndex("room_id", "room_id");
    },
  });

  const room = {
    id: "eca85484-983c-47fa-8463-b588d1fd7e0b",
    joined: true,
    name: "S[ck]rip(t|t?c)ie In[ck]",
  };
  try {
    await db.add("rooms", room);
  } catch (e) {
    console.log("Error when inserting room", e);
  }

  await db.add("messages", {
    id: uuid(),
    date: new Date(),
    message: "Hoi",
    room_id: room.id,
    username: "Mark",
  });

  console.log("adding value");
  // const tx = db.transaction("keyval", "readwrite");
  // const store = tx.objectStore("keyval");
  // const val = (await store.get("counter")) || 0;
  // await store.put(val + 1, "counter");
  // await tx.done;

  return db;
}
