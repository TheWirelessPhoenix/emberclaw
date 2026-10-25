import type { Backend, Channel, IncomingMessage, Session } from "./types.ts";

export type BackendFactory = () => Backend;

export interface RouterOptions {
  backends: Record<string, BackendFactory>;
  defaultBackend: string;
  isAllowed: (userId: string) => boolean;
  workdirFor: (chatId: string) => string;
}

// Routes each chat to one live backend session. Deny-by-default for users.
export class Router {
  private sessions = new Map<string, { backend: Backend; name: string }>();

  private opts: RouterOptions;

  constructor(opts: RouterOptions) {
    this.opts = opts;
  }

  async handle(channel: Channel, msg: IncomingMessage): Promise<void> {
    if (!this.opts.isAllowed(msg.userId)) return;
    const entry = await this.sessionFor(msg.chatId);
    await channel.send(msg.chatId, entry.backend.send(msg.text));
  }

  async switchBackend(chatId: string, name: string): Promise<void> {
    if (!this.opts.backends[name]) throw new Error(`unknown backend: ${name}`);
    await this.reset(chatId);
    await this.sessionFor(chatId, name);
  }

  async reset(chatId: string): Promise<void> {
    const entry = this.sessions.get(chatId);
    this.sessions.delete(chatId);
    await entry?.backend.stop();
  }

  async cancel(chatId: string): Promise<void> {
    await this.sessions.get(chatId)?.backend.cancel();
  }

  private async sessionFor(chatId: string, name = this.opts.defaultBackend) {
    const existing = this.sessions.get(chatId);
    if (existing) return existing;
    const factory = this.opts.backends[name];
    if (!factory) throw new Error(`unknown backend: ${name}`);
    const backend = factory();
    const session: Session = { id: `${chatId}-${Date.now()}`, chatId, workdir: this.opts.workdirFor(chatId) };
    await backend.start(session);
    const entry = { backend, name };
    this.sessions.set(chatId, entry);
    return entry;
  }
}
