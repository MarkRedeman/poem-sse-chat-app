import { test as base, expect } from "@playwright/test";

import { client } from "./../src/lib/api/client";

const test = base.extend<{
  username: string;
  session: { username: string };
}>({
  username: async ({ browserName }, use) => {
    return await use(`Mark - ${browserName}`);
  },

  session: async ({ page, username }, use) => {
    await page.goto("/");
    await page.getByLabel("Username").fill(username);
    await page.getByRole("button", { name: "Sign in" }).click();

    await use({ username });

    //await page.getByRole("button", { name: /logout/i }).click();
  },
});

test.beforeAll(async () => {
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

test("Sending chat messages in different rooms", async ({
  page,
  session: _,
}) => {
  const firstRoom = `${Math.ceil(Math.random() * 100)} - Chat room`;
  const secondRoom = `${Math.ceil(Math.random() * 100)} - Another room`;

  await page.goto("/");

  await page.getByLabel("Room name").fill(firstRoom);
  await page.getByRole("button", { name: "Create & join room" }).click();

  await page.getByPlaceholder("Type your message here...").fill("Hello world");
  await page.getByRole("button", { name: "Send Message" }).click();

  await page
    .getByPlaceholder("Type your message here...")
    .fill("Goodbye world");
  await page.getByRole("button", { name: "Send Message" }).click();

  await page.getByRole("button", { name: "Create room" }).click();
  await page.getByLabel("Room name").fill(secondRoom);
  await page.getByRole("button", { name: "Create & join room" }).click();

  await page
    .getByPlaceholder("Type your message here...")
    .fill("Sending a message");
  await page.getByRole("button", { name: "Send Message" }).click();

  await page
    .getByPlaceholder("Type your message here...")
    .fill("Sending another message");
  await page.getByRole("button", { name: "Send Message" }).click();

  await page.getByRole("link", { name: new RegExp(firstRoom) }).click();

  const main = page.getByRole("main");
  const messages = main.getByRole("list", { name: "Messages" });

  await expect(messages.getByText("Hello world")).toBeVisible();
  await expect(messages.getByText("Goodbye world")).toBeVisible();

  await page.getByRole("link", { name: new RegExp(secondRoom) }).click();

  await expect(messages.getByText("Sending a message")).toBeVisible();
  await expect(messages.getByText("Sending another message")).toBeVisible();
});

test("Sending many chat messages in different rooms", async ({
  page,
  session: _,
}) => {
  const firstRoom = `${Math.ceil(Math.random() * 100)} - Chat room with many messages`;
  const secondRoom = `${Math.ceil(Math.random() * 100)} - Another room with many messages`;

  await page.goto("/");

  await page.getByLabel("Room name").fill(firstRoom);
  await page.getByRole("button", { name: "Create & join room" }).click();

  await page.getByPlaceholder("Type your message here...").fill("Hello world");
  await page.getByRole("button", { name: "Send Message" }).click();

  for (let idx = 0; idx < 100; idx++) {
    const message = `Message ${idx}`;
    await page.getByPlaceholder("Type your message here...").fill(message);
    await page.getByRole("button", { name: "Send Message" }).click();
  }

  await page.getByRole("button", { name: "Create room" }).click();
  await page.getByLabel("Room name").fill(secondRoom);
  await page.getByRole("button", { name: "Create & join room" }).click();

  for (let idx = 0; idx < 100; idx++) {
    const message = `Message ${idx}`;
    await page.getByPlaceholder("Type your message here...").fill(message);
    await page.getByRole("button", { name: "Send Message" }).click();
  }

  await page.getByRole("link", { name: new RegExp(firstRoom) }).click();

  return;
  const main = page.getByRole("main");
  const messages = main.getByRole("list", { name: "Messages" });

  await expect(messages.getByText("Hello world")).toBeVisible();
  await expect(messages.getByText("Goodbye world")).toBeVisible();

  await page.getByRole("link", { name: new RegExp(secondRoom) }).click();

  await expect(messages.getByText("Sending a message")).toBeVisible();
  await expect(messages.getByText("Sending another message")).toBeVisible();
});
