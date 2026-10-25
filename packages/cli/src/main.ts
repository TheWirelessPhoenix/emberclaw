import { join } from "node:path";
import { loadConfig, Router, type BackendFactory } from "@emberclaw/core";
import { FakeBackend, PiBackend } from "@emberclaw/agent";
import { TerminalChannel } from "./terminal.ts";

const args = process.argv.slice(2);
const cmd = args.find((a) => !a.startsWith("-")) ?? "chat";

if (cmd === "chat") {
  const fake = args.includes("--fake");
  const config = fake ? null : loadConfig();
  const backends: Record<string, BackendFactory> = { fake: () => new FakeBackend() };
  if (config) backends.pi = () => new PiBackend(config);
  const channel = new TerminalChannel();
  const router = new Router({
    backends,
    defaultBackend: fake ? "fake" : "pi",
    isAllowed: (id) => id === "local",
    workdirFor: (chatId) => join(config?.home ?? ".emberclaw", "workspaces", chatId),
  });
  await channel.start((msg) => router.handle(channel, msg));
  await router.reset("local");
  await channel.stop();
} else {
  console.error(`unknown command: ${cmd}`);
  process.exit(1);
}
