# smart-router

opencode plugin for automatic API key rotation for OpenCode Go plans.

## Install

Copy `smart-router.ts` to `~/.opencode/`:

```bash
cp smart-router.ts ~/.opencode/
```

Then add to your `~/.config/opencode/opencode.json`:

```json
{
  "plugin": [
    ["~/.opencode/smart-router.ts", {
      "providers": ["opencode-go"],
      "keys": ["sk-key-1", "sk-key-2"]
    }]
  ]
}
```

Restart opencode.

## How it works

- On each chat request, injects the current key via the `Authorization` header.
- On error (401, 429, "Invalid API key", quota), rotates to the next key.
- Auto-sends "Continue" on error, stops after all keys are tried once.
- Session-aware: each new opencode process starts at the next key in sequence to distribute usage evenly.

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `keys` | `[]` | API keys to rotate through |
| `providers` | `["opencode-go"]` | Provider IDs to manage (only injects keys for these) |

## Getting API keys

Keys are tied to OpenCode workspaces. Each workspace gets its own API key.

1. Go to [opencode.ai](https://opencode.ai) and sign in
2. Create a new workspace
3. Make sure you have purchased **OpenCode Go** for that workspace
4. Go to **API Keys** → **Create API Key** → copy the API key

Put each API key in the config - the plugin will handle the rotation.
