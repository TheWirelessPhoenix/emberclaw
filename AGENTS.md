# Working on Ember Claw

- TypeScript run directly by Node 24 (type stripping). No build step. Use `import ... from "./x.ts"`, no enums, no parameter properties.
- `npm run typecheck` and `npm test` (node:test) must pass before a commit.
- Security code lives in `packages/core/src/policy.ts` and `packages/sandbox`. Any change there needs a test, including a failing-escape test for sandbox changes.
- pi is the only agent backend. Extend it with pi extensions (`packages/agent/src/extensions.ts`, or user extensions in `~/.emberclaw/pi/extensions`).
- Keep provider, model, and endpoint in config, never in code.
