import { existsSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { shellQuote, type Sandbox, type SandboxPolicy } from "./types.ts";

const SANDBOX_EXEC = "/usr/bin/sandbox-exec";

// Seatbelt resolves symlinks (/tmp -> /private/tmp), so profile paths must be real.
function real(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

function lit(p: string): string {
  return JSON.stringify(real(p));
}

export function seatbeltProfile(policy: SandboxPolicy): string {
  const writable = [policy.workdir, tmpdir(), "/private/tmp", ...policy.writable];
  return [
    "(version 1)",
    "(allow default)",
    "(deny file-write*)",
    `(allow file-write* ${writable.map((p) => `(subpath ${lit(p)})`).join(" ")}`,
    '  (literal "/dev/null") (literal "/dev/zero") (literal "/dev/dtracehelper")',
    '  (regex #"^/dev/tty") (regex #"^/dev/fd/"))',
    ...(policy.denyRead.length
      ? [`(deny file-read* ${policy.denyRead.map((p) => `(subpath ${lit(p)})`).join(" ")})`]
      : []),
    ...(policy.network ? [] : ['(deny network*)', '(allow network* (remote unix-socket))']),
  ].join("\n");
}

export const seatbelt: Sandbox & { available(): boolean } = {
  name: "seatbelt",
  enforcing: true,
  available: () => process.platform === "darwin" && existsSync(SANDBOX_EXEC),
  wrap(command, policy) {
    return `exec ${SANDBOX_EXEC} -p ${shellQuote(seatbeltProfile(policy))} /bin/bash -c ${shellQuote(command)}`;
  },
};
