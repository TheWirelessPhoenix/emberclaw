import type { Backend, Event, Session } from "@emberclaw/core";

// Echo backend for tests and offline demos.
export class FakeBackend implements Backend {
  readonly name = "fake";
  private cancelled = false;

  async start(_session: Session): Promise<void> {}

  async *send(text: string): AsyncIterable<Event> {
    this.cancelled = false;
    for (const word of `You said: ${text}`.split(" ")) {
      if (this.cancelled) break;
      yield { type: "text", text: word + " " };
    }
    yield { type: "done" };
  }

  async cancel(): Promise<void> {
    this.cancelled = true;
  }

  async stop(): Promise<void> {}
}
