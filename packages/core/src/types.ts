export type Event =
  | { type: "text"; text: string }
  | { type: "tool_call"; id: string; name: string; input: unknown }
  | { type: "tool_result"; id: string; output: string; isError: boolean }
  | { type: "done" }
  | { type: "error"; message: string };

export interface ApprovalRequest {
  action: string;
  detail: string;
}

export interface Session {
  id: string;
  chatId: string;
  workdir: string;
}

export interface SessionHooks {
  askApproval(req: ApprovalRequest): Promise<boolean>;
}

export interface Backend {
  readonly name: string;
  start(session: Session, hooks: SessionHooks): Promise<void>;
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
  askApproval(chatId: string, req: ApprovalRequest): Promise<boolean>;
  stop(): Promise<void>;
}
