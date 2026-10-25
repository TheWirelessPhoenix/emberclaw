import { createInterface } from "node:readline/promises";
import type { Channel, Event, IncomingMessage } from "@emberclaw/core";

// Local terminal channel: lets you chat with a backend without Telegram.
export class TerminalChannel implements Channel {
  readonly name = "cli";
  private rl = createInterface({ input: process.stdin, output: process.stdout });
  private closed = new Promise<null>((resolve) => this.rl.once("close", () => resolve(null)));

  async start(onMessage: (msg: IncomingMessage) => Promise<void>): Promise<void> {
    while (true) {
      const line = await Promise.race([this.rl.question("you> "), this.closed]);
      if (line === null) return;
      if (line.trim() === "/quit") return;
      if (line.trim()) await onMessage({ chatId: "local", userId: "local", text: line });
    }
  }

  async send(_chatId: string, events: AsyncIterable<Event>): Promise<void> {
    process.stdout.write("ember> ");
    for await (const e of events) {
      if (e.type === "text") process.stdout.write(e.text);
      else if (e.type === "tool_call") process.stdout.write(`\n[tool ${e.name}]\n`);
      else if (e.type === "error") process.stdout.write(`\n[error] ${e.message}`);
    }
    process.stdout.write("\n");
  }

  async askApproval(_chatId: string, req: { action: string; detail: string }): Promise<boolean> {
    const a = await this.rl.question(`approve ${req.action}: ${req.detail}? [y/N] `);
    return a.trim().toLowerCase() === "y";
  }

  async stop(): Promise<void> {
    this.rl.close();
  }
}
