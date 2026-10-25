export interface SandboxPolicy {
  workdir: string;
  // Extra writable paths besides workdir and the temp dir.
  writable: string[];
  // Paths the sandboxed command must not read.
  denyRead: string[];
  network: boolean;
}

export interface Sandbox {
  readonly name: string;
  readonly enforcing: boolean;
  // Returns a shell command that runs `command` inside the sandbox.
  wrap(command: string, policy: SandboxPolicy): string;
}

export function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}
