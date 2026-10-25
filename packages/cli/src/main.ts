import { Router } from "@emberclaw/core";
import { FakeBackend } from "@emberclaw/backends";
import { TerminalChannel } from "./terminal.ts";

const [cmd = "chat"] = process.argv.slice(2);

if (cmd === "chat") {
  const channel = new TerminalChannel();
  const router = new Router({
    backends: { fake: () => new FakeBackend() },
    defaultBackend: "fake",
    isAllowed: (id) => id === "local",
    workdirFor: (chatId) => `.emberclaw/workspaces/${chatId}`,
  });
  await channel.start((msg) => router.handle(channel, msg));
  await channel.stop();
} else {
  console.error(`unknown command: ${cmd}`);
  process.exit(1);
}
