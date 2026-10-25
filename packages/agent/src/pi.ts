import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createAgentSession,
  DefaultResourceLoader,
  ModelRuntime,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import { AsyncQueue, secretPaths, type Backend, type EmberConfig, type Event, type Session, type SessionHooks } from "@emberclaw/core";
import { selectSandbox, type SandboxPolicy } from "@emberclaw/sandbox";
import { guardExtension, sandboxedBashExtension } from "./extensions.ts";

type AgentSession = Awaited<ReturnType<typeof createAgentSession>>["session"];

function textOf(result: any): string {
  const parts = Array.isArray(result?.content) ? result.content : [];
  const text = parts.filter((p: any) => p?.type === "text").map((p: any) => p.text).join("\n");
  return (text || JSON.stringify(result ?? "")).slice(0, 4000);
}

// pi embedded in-process, with Ember's own agent dir, policy guard, and sandboxed bash.
export class PiBackend implements Backend {
  readonly name = "pi";
  private session?: AgentSession;
  private config: EmberConfig;

  constructor(config: EmberConfig) {
    this.config = config;
  }

  async start(s: Session, hooks: SessionHooks): Promise<void> {
    const agentDir = join(this.config.home, "pi");
    mkdirSync(agentDir, { recursive: true });
    mkdirSync(s.workdir, { recursive: true });
    const modelsPath = join(agentDir, "models.json");
    writeFileSync(modelsPath, JSON.stringify({ providers: this.config.providers }, null, 2));

    const sandbox = selectSandbox(this.config.sandbox.mode, this.config.sandbox.required);
    const denyRead = [...secretPaths(), join(this.config.home, "config.json"), join(agentDir, "auth.json")];
    const policy: SandboxPolicy = { workdir: s.workdir, writable: [], denyRead, network: this.config.sandbox.network };

    const modelRuntime = await ModelRuntime.create({ authPath: join(agentDir, "auth.json"), modelsPath });
    const { provider, id } = this.config.model;
    const model = modelRuntime.getModel(provider, id);
    if (!model) throw new Error(`model ${provider}/${id} not found. Check "providers" in your config.`);

    const settingsManager = SettingsManager.inMemory({ defaultProjectTrust: "never" });
    const resourceLoader = new DefaultResourceLoader({
      cwd: s.workdir,
      agentDir,
      settingsManager,
      extensionFactories: [
        guardExtension({ workdir: s.workdir, sandboxed: sandbox.enforcing, extraDenyRead: denyRead }, hooks),
        sandboxedBashExtension(sandbox, policy),
      ],
    });
    await resourceLoader.reload();

    const { session } = await createAgentSession({
      cwd: s.workdir,
      agentDir,
      model,
      modelRuntime,
      resourceLoader,
      settingsManager,
      sessionManager: SessionManager.create(s.workdir, join(agentDir, "sessions")),
    });
    this.session = session;
  }

  async *send(text: string): AsyncIterable<Event> {
    const session = this.session;
    if (!session) throw new Error("pi session not started");
    const queue = new AsyncQueue<Event>();
    const unsubscribe = session.subscribe((e: any) => {
      if (e.type === "message_update" && e.assistantMessageEvent?.type === "text_delta")
        queue.push({ type: "text", text: e.assistantMessageEvent.delta });
      else if (e.type === "tool_execution_start")
        queue.push({ type: "tool_call", id: e.toolCallId, name: e.toolName, input: e.args });
      else if (e.type === "tool_execution_end")
        queue.push({ type: "tool_result", id: e.toolCallId, output: textOf(e.result), isError: !!e.isError });
      else if (e.type === "message_end" && e.message?.role === "assistant" && e.message?.stopReason === "error")
        queue.push({ type: "error", message: String(e.message.errorMessage ?? "model error") });
    });
    session
      .prompt(text)
      .catch((err: unknown) => queue.push({ type: "error", message: err instanceof Error ? err.message : String(err) }))
      .finally(() => {
        unsubscribe();
        queue.push({ type: "done" });
        queue.close();
      });
    yield* queue;
  }

  async cancel(): Promise<void> {
    await this.session?.abort();
  }

  async stop(): Promise<void> {
    this.session?.dispose();
    this.session = undefined;
  }
}
