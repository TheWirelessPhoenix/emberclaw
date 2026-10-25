import { bwrap } from "./bwrap.ts";
import { seatbelt } from "./seatbelt.ts";
import type { Sandbox } from "./types.ts";

export * from "./types.ts";
export { seatbelt, seatbeltProfile } from "./seatbelt.ts";
export { bwrap } from "./bwrap.ts";

export const noSandbox: Sandbox = { name: "none", enforcing: false, wrap: (command) => command };

export type SandboxMode = "auto" | "seatbelt" | "bwrap" | "none";

// Picks the OS sandbox. With `required`, throws instead of running unprotected.
export function selectSandbox(mode: SandboxMode, required: boolean): Sandbox {
  const candidates = mode === "auto" ? [seatbelt, bwrap] : mode === "seatbelt" ? [seatbelt] : mode === "bwrap" ? [bwrap] : [];
  const found = candidates.find((s) => s.available());
  if (found) return found;
  if (required) throw new Error(`sandbox "${mode}" is required but not available on ${process.platform}`);
  return noSandbox;
}
