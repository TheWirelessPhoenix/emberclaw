import { test } from "node:test";
import assert from "node:assert/strict";
import { Router, type Channel, type Event } from "../src/index.ts";
import { FakeBackend } from "../../backends/src/fake.ts";

function capture() {
  const out: Event[] = [];
  const channel = {
    async send(_id: string, events: AsyncIterable<Event>) {
      for await (const e of events) out.push(e);
    },
  } as unknown as Channel;
  return { out, channel };
}

const router = (allowed: string[]) =>
  new Router({
    backends: { fake: () => new FakeBackend() },
    defaultBackend: "fake",
    isAllowed: (id) => allowed.includes(id),
    workdirFor: (c) => `/tmp/${c}`,
  });

test("allowed user gets a reply", async () => {
  const { out, channel } = capture();
  await router(["u1"]).handle(channel, { chatId: "c", userId: "u1", text: "hi" });
  assert.equal(out.map((e) => (e.type === "text" ? e.text : "")).join(""), "You said: hi ");
  assert.equal(out.at(-1)?.type, "done");
});

test("unknown user is ignored", async () => {
  const { out, channel } = capture();
  await router(["u1"]).handle(channel, { chatId: "c", userId: "evil", text: "hi" });
  assert.equal(out.length, 0);
});

test("switching to an unknown backend throws", async () => {
  await assert.rejects(router(["u1"]).switchBackend("c", "nope"), /unknown backend/);
});
