import { Browser, expect } from "@playwright/test";

import { client } from "./../src/lib/api/client";
import { ChatContext, RoomPage, test } from "./base-test";

test.beforeAll(async () => {
  return;
  console.log("Clearing rooms?");
  const session = await client.POST("/session", {
    body: { username: "Admin" },
  });
  const headers = session.response.headers;
  const Cookie = headers.get("set-cookie")?.split(";")[0];

  const rooms = await client.GET("/rooms", { headers: { Cookie } });

  for (const room of rooms.data ?? []) {
    await client.DELETE("/rooms/{room_id}", {
      params: { path: { room_id: room.id } },
      body: {
        removed_at: "2024-06-09T14:00:00Z",
      },
      headers: { Cookie },
    });
  }
});

test.describe("Single user", () => {
  test.beforeEach(async ({ page, sessionPage, username }) => {
    await page.goto("/");
    await sessionPage.login(username);
  });

  // test.afterEach(async ({ sessionPage }) => {
  //   await sessionPage.logout();
  // });

  test("Sending chat messages in different rooms", async ({ roomPage }) => {
    const firstRoom = `${Math.ceil(Math.random() * 1000)} - Chat room`;
    const secondRoom = `${Math.ceil(Math.random() * 1000)} - Another room`;

    await roomPage.createNewRoom(firstRoom);

    await roomPage.sendMessage("Hello world");
    await roomPage.sendMessage("Goodbye world");

    await roomPage.createNewRoom(secondRoom);

    await roomPage.sendMessage("Sending a message");
    await roomPage.sendMessage("Sending another message");

    await roomPage.gotoRoom(firstRoom);

    await expect(roomPage.message("Hello world")).toBeVisible();
    await expect(roomPage.message("Goodbye world")).toBeVisible();

    await roomPage.gotoRoom(secondRoom);

    await expect(roomPage.message("Sending a message")).toBeVisible();
    await expect(roomPage.message("Sending another message")).toBeVisible();
  });

  test("Sending many chat messages in different rooms", async ({
    roomPage,
  }) => {
    const firstRoom = `${Math.ceil(Math.random() * 1000)} - Chat room with many messages`;
    const secondRoom = `${Math.ceil(Math.random() * 1000)} - Another room with many messages`;

    await roomPage.createNewRoom(firstRoom);

    await roomPage.sendMessage("Hello world");

    for (let idx = 0; idx < 100; idx++) {
      await roomPage.sendMessage(`Message ${idx}`);
    }

    await roomPage.createNewRoom(secondRoom);

    for (let idx = 0; idx < 100; idx++) {
      await roomPage.sendMessage(`Message ${idx}`);
    }

    await roomPage.gotoRoom(firstRoom);
  });
});

async function openNewChatContext(browser: Browser) {
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  return new ChatContext(otherPage);
}

test("Chatting with two users", async ({
  page,
  roomPage,
  sessionPage,
  browser,
}) => {
  const firstRoom = `${Math.ceil(Math.random() * 1000)} - Private room`;

  await page.goto("/");
  await sessionPage.login("John Snow");
  await roomPage.createNewRoom(firstRoom);

  const otherContext = await openNewChatContext(browser);

  await otherContext.page.goto("/");
  await otherContext.session.login("Arya Stark");
  await otherContext.room.gotoRoom(firstRoom);

  await roomPage.sendMessage("Hoi");
  await otherContext.room.sendMessage("Oh hi");

  //await page.pause();

  const sendManyMessages = async (room: RoomPage) => {
    for (let idx = 0; idx < 100; idx++) {
      await room.sendMessage(`Message ${idx}`);
    }
  };

  await Promise.all([
    sendManyMessages(roomPage),
    sendManyMessages(otherContext.room),
  ]);
});

test.setTimeout(60 * 60 * 1000);

test.skip("Chatting with many users", async ({
  page,
  roomPage,
  sessionPage,
  browser,
  headless,
}) => {
  const firstRoom = `${Math.ceil(Math.random() * 1000)} - Private room`;

  await page.goto("/");
  await sessionPage.login("John Snow");
  await roomPage.createNewRoom(firstRoom);

  const login = async (context: ChatContext, username: string) => {
    await context.page.goto("/");
    await context.session.login(username);
    await context.room.gotoRoom(firstRoom);
    return context;
  };
  const otherContexts = await Promise.all([
    openNewChatContext(browser).then((c) => login(c, "Arya Stark")),
    openNewChatContext(browser).then((c) => login(c, "Eddard Stark")),
    openNewChatContext(browser).then((c) => login(c, "Robb Stark")),
    openNewChatContext(browser).then((c) => login(c, "Sansa Stark")),
  ]);

  // Pause test so that we can move each window into a nice position
  if (!headless) {
    await page.pause();
  }

  const sendManyMessages = async (room: RoomPage) => {
    for (let idx = 0; idx < 100; idx++) {
      await room.sendMessage(`Message ${idx}`);
    }
  };

  await Promise.all([
    sendManyMessages(roomPage),
    ...otherContexts.map((context) => sendManyMessages(context.room)),
  ]);
});
