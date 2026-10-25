import { homedir } from "node:os";
import { isAbsolute, relative, resolve } from "node:path";

export type Decision = "allow" | "ask" | "deny";

export interface PolicyContext {
  workdir: string;
  sandboxed: boolean;
  home?: string;
  extraDenyRead?: string[];
}

const READ_TOOLS = new Set(["read", "grep", "find", "ls"]);
const WRITE_TOOLS = new Set(["write", "edit"]);
const SHELL_TOOLS = new Set(["bash", "powershell"]);

// Paths that hold credentials. Never readable by the agent.
export function secretPaths(home = homedir()): string[] {
  return [
    ".ssh", ".aws", ".gnupg", ".azure", ".kube", ".docker",
    ".config/gh", ".config/gcloud", ".netrc", ".npmrc", ".pypirc",
    ".pi/agent/auth.json", ".emberclaw/secrets",
  ].map((p) => resolve(home, p));
}

const DANGEROUS_SHELL = [
  /\bsudo\b/, /\brm\s+-[a-z]*r[a-z]*f?\s+(\/|~)(\s|$)/i, /\bmkfs\b/, /\bdd\s+if=/,
  /:\(\)\s*\{\s*:\|:&\s*\};:/, /\bchmod\s+-R\s+777\b/, /\bcurl\b[^|]*\|\s*(ba|z)?sh\b/,
];

export function isInside(path: string, dir: string): boolean {
  const rel = relative(resolve(dir), resolve(path));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function isSecret(path: string, ctx: PolicyContext): boolean {
  const abs = resolve(ctx.workdir, path);
  if (/(^|\/)\.env(\.[^/]*)?$/.test(abs)) return true;
  return [...secretPaths(ctx.home), ...(ctx.extraDenyRead ?? [])].some((s) => isInside(abs, s));
}

// Decides what to do with one tool call. Unknown tools need approval.
export function decide(tool: string, input: Record<string, unknown>, ctx: PolicyContext): Decision {
  const path = typeof input.path === "string" ? input.path : ctx.workdir;
  if (READ_TOOLS.has(tool)) {
    if (isSecret(path, ctx)) return "deny";
    return isInside(resolve(ctx.workdir, path), ctx.workdir) ? "allow" : "ask";
  }
  if (WRITE_TOOLS.has(tool)) {
    if (isSecret(path, ctx)) return "deny";
    return isInside(resolve(ctx.workdir, path), ctx.workdir) ? "allow" : "ask";
  }
  if (SHELL_TOOLS.has(tool)) {
    const cmd = typeof input.command === "string" ? input.command : "";
    if (!ctx.sandboxed) return "ask";
    return DANGEROUS_SHELL.some((re) => re.test(cmd)) ? "ask" : "allow";
  }
  return "ask";
}
