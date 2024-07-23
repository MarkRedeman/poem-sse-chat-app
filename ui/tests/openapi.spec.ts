import { expect, mergeTests } from "@playwright/test";

import { test as baseTest } from "./base-test";
import { test as openApiTest } from "./open-api/open-api";

const test = mergeTests(openApiTest, baseTest);

test.describe("Single user", () => {
  test("Loggign in and logging out", async ({ sessionPage, page, openApi }) => {
    let signedInUser: string | undefined = undefined;
    openApi.registerApiResponse("get", "/session", (request) => {
      if (signedInUser) {
        return { status: 200, body: { username: signedInUser } };
      }
      return { status: 401 };
    });

    openApi.registerApiResponse("post", "/session", (request) => {
      console.log(request);
      signedInUser = request.body.username;

      return { status: 200 };
    });

    openApi.registerApiResponse("delete", "/session", (request) => {
      console.log(request);
      signedInUser = undefined;

      return { status: 200 };
    });

    await page.goto("/");

    await sessionPage.login("Mark");
    await sessionPage.logout();
  });

  test.skip("Sending chat messages in different rooms", async ({
    roomPage,
    openApi,
    page,
  }) => {
    openApi.registerApiResponse("get", "/session", (request) => {
      return {
        status: 200,
        body: { username: "Mark" },
      };
    });

    openApi.registerApiResponse("get", "/rooms/{room_id}", (request) => {
      return {
        status: 200,
        body: {
          id: "test",
          messages: [],
          name: "test",
          users: [],
        },
      };
    });

    await page.goto("/");

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
});

/**
 * - Login
 * - Logout
 * - Rooms (no rooms)
 * - Rooms (many rooms)
 * - Rooms (404 rooms)
 * - Rooms (5xx rooms)
 * - Create room (201)
 * - Create room (415)
 * - Create room (401)
 * - Create room (500)
 * - Room (200)
 * - Room (404)
 * - Room (500)
 *
 * - Room / messages (200)
 * - Room / messages (404)
 * - Room / messages (500)
 * - Room / send message (201)
 * - Room / send message (415)
 * - Room / send message (401)
 * - Room / send message (500)
 */
