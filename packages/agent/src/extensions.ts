import { createBashTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { decide, type PolicyContext, type SessionHooks } from "@emberclaw/core";
import type { Sandbox, SandboxPolicy } from "@emberclaw/sandbox";

// Gates every tool call through Ember's policy. Fails closed: a thrown handler blocks the tool.
export function guardExtension(ctx: PolicyContext, hooks: SessionHooks) {
  return (pi: ExtensionAPI) => {
    pi.on("tool_call", async (event) => {
      const input = (event.input ?? {}) as Record<string, unknown>;
      const decision = decide(event.toolName, input, ctx);
      if (decision === "allow") return undefined;
      if (decision === "deny") return { block: true, reason: `Ember policy denies ${event.toolName} here` };
      const detail = typeof input.command === "string" ? input.command : JSON.stringify(input).slice(0, 500);
      const ok = await hooks.askApproval({ action: event.toolName, detail });
      return ok ? undefined : { block: true, reason: "The user denied this action" };
    });
  };
}

// Replaces pi's bash tool with one that runs every command inside the OS sandbox.
export function sandboxedBashExtension(sandbox: Sandbox, policy: SandboxPolicy) {
  return (pi: ExtensionAPI) => {
    if (!sandbox.enforcing) return;
    const bash = createBashTool(policy.workdir, {
      spawnHook: ({ command, cwd, env }) => ({ command: sandbox.wrap(command, policy), cwd, env }),
    });
    pi.registerTool({
      ...bash,
      execute: (id, params, signal, onUpdate) => bash.execute(id, params, signal, onUpdate),
    });
  };
}
