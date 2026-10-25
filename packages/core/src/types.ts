export type Event =
  | { type: "text"; text: string }
  | { type: "tool_call"; id: string; name: string; input: unknown }
  | { type: "tool_result"; id: string; output: string }
  | { type: "approval_request"; id: string; action: string; detail: string }
  | { type: "done" }
  | { type: "error"; message: string };

export interface Session {
  id: string;
  chatId: string;
  workdir: string;
}

export interface Backend {
  readonly name: string;
  start(session: Session): Promise<void>;
  send(text: string): AsyncIterable<Event>;
  cancel(): Promise<void>;
  stop(): Promise<void>;
}

export interface IncomingMessage {
  chatId: string;
  userId: string;
  text: string;
}

export interface Channel {
  readonly name: string;
  start(onMessage: (msg: IncomingMessage) => Promise<void>): Promise<void>;
  send(chatId: string, events: AsyncIterable<Event>): Promise<void>;
  askApproval(chatId: string, req: { action: string; detail: string }): Promise<boolean>;
  stop(): Promise<void>;
}
