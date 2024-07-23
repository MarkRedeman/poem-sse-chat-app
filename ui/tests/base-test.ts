import { Browser, Locator, Page, test as base, expect } from "@playwright/test";

import { client } from "./../src/lib/api/client";

export class SessionPage {
  constructor(private page: Page) {}

  async login(username: string) {
    await this.page.getByLabel("Username").fill(username);
    await this.page.getByRole("button", { name: "Sign in" }).click();
  }

  async logout() {
    await this.page.getByRole("button", { name: /logout/i }).click();
  }
}

export class RoomPage {
  readonly messages: Locator;

  constructor(private page: Page) {
    const main = page.getByRole("main");
    const messages = main.getByRole("list", { name: "Messages" });
    this.messages = messages;
  }

  async createNewRoom(name: string) {
    const roomName = this.page.getByLabel("Room name");
    if (await roomName.isHidden()) {
      await this.page.getByRole("button", { name: "Create room" }).click();
    }

    await roomName.fill(name);
    await this.page.getByRole("button", { name: "Create & join room" }).click();
  }

  async gotoRoom(name: string) {
    await this.page.getByRole("link", { name: new RegExp(name) }).click();
  }

  async sendMessage(message: string) {
    await this.page.getByPlaceholder("Type your message here...").fill(message);
    await this.page.getByRole("button", { name: "Send Message" }).click();
  }

  message(message: string): Locator {
    return this.messages.getByText(message);
  }
}

export class ChatContext {
  readonly session: SessionPage;
  readonly room: RoomPage;

  constructor(readonly page: Page) {
    this.session = new SessionPage(page);
    this.room = new RoomPage(page);
  }
}

export const test = base.extend<{
  username: string;
  session: { username: string };
  sessionPage: SessionPage;
  roomPage: RoomPage;
}>({
  sessionPage: async ({ page }, use) => {
    await use(new SessionPage(page));
  },
  roomPage: async ({ page }, use) => {
    await use(new RoomPage(page));
  },

  username: async ({ browserName }, use) => {
    return await use(`Mark - ${browserName}`);
  },
});

// import { mergeTests } from '@playwright/test';
// import { test as dbTest } from 'database-test-utils';
// import { test as a11yTest } from 'a11y-test-utils';

// export const test = mergeTests(dbTest, a11yTest);
