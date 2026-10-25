import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export type SandboxMode = "auto" | "seatbelt" | "bwrap" | "none";

export interface EmberConfig {
  home: string;
  model: { provider: string; id: string; thinking?: string };
  // Written as-is to pi's models.json. Keys use "$ENV_VAR" references.
  providers: Record<string, unknown>;
  sandbox: { mode: SandboxMode; required: boolean; network: boolean };
  allowUsers: string[];
  telegram?: { tokenEnv: string };
}

export function emberHome(): string {
  return resolve(process.env.EMBERCLAW_HOME ?? join(homedir(), ".emberclaw"));
}

const SANDBOX_MODES: SandboxMode[] = ["auto", "seatbelt", "bwrap", "none"];

export function parseConfig(raw: unknown, home = emberHome()): EmberConfig {
  const c = (raw ?? {}) as Record<string, any>;
  const fail = (msg: string): never => {
    throw new Error(`config: ${msg}`);
  };
  if (!c.model || typeof c.model.provider !== "string" || typeof c.model.id !== "string")
    fail('"model" needs "provider" and "id" strings');
  const sandbox = { mode: "auto" as SandboxMode, required: false, network: true, ...(c.sandbox ?? {}) };
  if (!SANDBOX_MODES.includes(sandbox.mode)) fail(`"sandbox.mode" must be one of ${SANDBOX_MODES.join(", ")}`);
  if (c.allowUsers !== undefined && !Array.isArray(c.allowUsers)) fail('"allowUsers" must be a list');
  return {
    home,
    model: c.model,
    providers: c.providers ?? {},
    sandbox,
    allowUsers: (c.allowUsers ?? []).map(String),
    telegram: c.telegram,
  };
}

export function loadConfig(path = process.env.EMBERCLAW_CONFIG ?? join(emberHome(), "config.json")): EmberConfig {
  if (!existsSync(path)) throw new Error(`no config at ${path}. Copy config.example.json there, or run "emberclaw onboard".`);
  return parseConfig(JSON.parse(readFileSync(path, "utf8")));
}
