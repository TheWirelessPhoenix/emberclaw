import { createInterface } from "node:readline";
import { AsyncQueue, type ApprovalRequest, type Channel, type Event, type IncomingMessage } from "@emberclaw/core";

// Local terminal channel: lets you chat with the agent without Telegram.
// All input (messages and approval answers) flows through one line queue, so piped input works.
export class TerminalChannel implements Channel {
  readonly name = "cli";
  private lines = new AsyncQueue<string>();
  private reader = this.lines[Symbol.asyncIterator]();
  private rl = createInterface({ input: process.stdin });

  constructor() {
    this.rl.on("line", (l) => this.lines.push(l));
    this.rl.on("close", () => this.lines.close());
  }

  private async ask(prompt: string): Promise<string | null> {
    process.stdout.write(prompt);
    const r = await this.reader.next();
    return r.done ? null : r.value;
  }

  async start(onMessage: (msg: IncomingMessage) => Promise<void>): Promise<void> {
    while (true) {
      const line = await this.ask("you> ");
      if (line === null || line.trim() === "/quit") return;
      if (line.trim()) await onMessage({ chatId: "local", userId: "local", text: line });
    }
  }

  async send(_chatId: string, events: AsyncIterable<Event>): Promise<void> {
    process.stdout.write("ember> ");
    for await (const e of events) {
      if (e.type === "text") process.stdout.write(e.text);
      else if (e.type === "tool_call") process.stdout.write(`\n[tool ${e.name}]\n`);
      else if (e.type === "tool_result" && e.isError) process.stdout.write(`[tool error] ${e.output.slice(0, 200)}\n`);
      else if (e.type === "error") process.stdout.write(`\n[error] ${e.message}`);
    }
    process.stdout.write("\n");
  }

  async askApproval(_chatId: string, req: ApprovalRequest): Promise<boolean> {
    const a = await this.ask(`\napprove ${req.action}: ${req.detail}? [y/N] `);
    return a?.trim().toLowerCase() === "y";
  }

  async stop(): Promise<void> {
    this.rl.close();
  }
}
