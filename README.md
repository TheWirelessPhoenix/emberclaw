# 🔥 Ember Claw

A phoenix-themed personal agent you talk to from Telegram (Discord and Slack coming). Built on [pi](https://github.com/earendil-works/pi), with security on by default.

> Status: early development (M2). Not ready for daily use yet.

## Quick start (dev)

Requires Node.js 24+.

```sh
npm install
mkdir -p ~/.emberclaw && cp config.example.json ~/.emberclaw/config.json
export NEBIUS_API_KEY=...        # or any provider you add to "providers"
npm run chat                     # chat in the terminal
npm run chat -- --fake           # offline echo backend
```

## Security model

- **Policy guard** on every tool call: reads/writes inside the chat workspace are allowed, credential paths (`~/.ssh`, `~/.aws`, `.env`, ...) are denied, everything else asks you first.
- **OS sandbox for shell commands**: Seatbelt on macOS, bubblewrap on Linux. Commands can write only to the workspace and temp dir and cannot read secrets. Where no sandbox exists (e.g. Windows), every shell command needs approval. Set `"sandbox": { "required": true }` to refuse to run without one.
- **Separate pi home** (`~/.emberclaw/pi`): Ember never touches your own `~/.pi`. API keys stay in environment variables (`"$NEBIUS_API_KEY"` in config).
- Project-local `.pi` resources are never trusted.

## Layout

| Package | Role |
|---|---|
| `packages/core` | types, router, policy, config |
| `packages/sandbox` | Seatbelt / bubblewrap wrappers |
| `packages/agent` | pi backend + Ember extensions |
| `packages/cli` | `emberclaw` command |

## License

TBD
