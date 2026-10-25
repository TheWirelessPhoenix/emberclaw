import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, realpathSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { selectSandbox, shellQuote, noSandbox } from "../src/index.ts";

test("shellQuote survives single quotes", () => {
  const out = execFileSync("sh", ["-c", `echo ${shellQuote("it's $HOME")}`], { encoding: "utf8" });
  assert.equal(out.trim(), "it's $HOME");
});

test("required sandbox with mode none throws; optional falls back", () => {
  assert.throws(() => selectSandbox("none", true), /required/);
  assert.equal(selectSandbox("none", false), noSandbox);
});

const sandbox = selectSandbox("auto", false);
const live = sandbox.enforcing ? test : test.skip;

function run(cmd: string, policy: Parameters<typeof sandbox.wrap>[1]): number {
  try {
    execFileSync("/bin/bash", ["-c", sandbox.wrap(cmd, policy)], { cwd: policy.workdir, stdio: "ignore" });
    return 0;
  } catch (e: any) {
    return e.status ?? 1;
  }
}

live(`${sandbox.name}: writes only inside workdir, secrets unreadable`, () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "ember-sbx-")));
  const workdir = join(root, "work");
  const secret = join(root, "secret");
  mkdirSync(workdir);
  mkdirSync(secret);
  writeFileSync(join(secret, "key"), "s3cret");
  // A home-dir target outside both temp and workdir.
  const escape = join(homedir(), `.ember-escape-${process.pid}`);
  const policy = { workdir, writable: [], denyRead: [secret], network: true };

  assert.equal(run(`echo ok > ${shellQuote(join(workdir, "a.txt"))}`, policy), 0);
  assert.ok(existsSync(join(workdir, "a.txt")));
  assert.notEqual(run(`echo bad > ${shellQuote(escape)}`, policy), 0);
  assert.ok(!existsSync(escape), "escaped the sandbox");
  assert.notEqual(run(`cat ${shellQuote(join(secret, "key"))}`, policy), 0);
});
