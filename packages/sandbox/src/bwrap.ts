import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { shellQuote, type Sandbox } from "./types.ts";

function which(bin: string): string | null {
  try {
    return execFileSync("sh", ["-c", `command -v ${bin}`], { encoding: "utf8" }).trim() || null;
  } catch {
    return null;
  }
}

// Linux bubblewrap: read-only root, writable workdir, secrets hidden by empty tmpfs.
export const bwrap: Sandbox & { available(): boolean } = {
  name: "bwrap",
  enforcing: true,
  available: () => process.platform === "linux" && which("bwrap") !== null,
  wrap(command, policy) {
    const args = [
      "bwrap", "--ro-bind", "/", "/", "--dev", "/dev", "--proc", "/proc",
      "--bind", tmpdir(), tmpdir(),
      "--bind", policy.workdir, policy.workdir,
      ...policy.writable.filter(existsSync).flatMap((p) => ["--bind", p, p]),
      ...policy.denyRead.filter(existsSync).flatMap((p) => ["--tmpfs", p]),
      "--unshare-pid", "--unshare-ipc", "--die-with-parent", "--new-session",
      ...(policy.network ? [] : ["--unshare-net"]),
      "--chdir", policy.workdir, "/bin/bash", "-c", command,
    ];
    return "exec " + args.map(shellQuote).join(" ");
  },
};
