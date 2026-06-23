# DiffRoom

Local-first review workspace for Git diffs and coding agents.

> AI changes code → developer reviews diff → developer leaves notes → DiffRoom generates a structured prompt → agent improves the code.

DiffRoom runs entirely on your machine: no accounts, no hosted service, nothing uploaded. Run it inside a Git repository to open a local, GitHub-like diff review UI, leave review notes, and generate a clean prompt to feed back to Claude Code, GitHub Copilot, Cursor, or any other coding agent.

## Status

Early development. Built in small, test-first vertical slices.

## Development

```bash
# backend
cd backend
uv sync
uv run pytest

# frontend
cd frontend
pnpm install
pnpm test
```

## License

MIT
