# DiffRoom developer tasks. Run `just` to list.

# Default: show available recipes
default:
    @just --list

# Install all dependencies (backend + frontend)
install:
    cd backend && uv sync
    cd frontend && pnpm install

# Run the backend test suite
test-backend:
    cd backend && uv run pytest

# Run the frontend test suite
test-frontend:
    cd frontend && pnpm test

# Run all tests
test: test-backend test-frontend

# Lint + typecheck everything
check:
    cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy
    cd frontend && pnpm lint && pnpm typecheck && pnpm format:check

# Build the frontend into the backend package's static dir
build-frontend:
    cd frontend && pnpm build

# Build the wheel (frontend first, then the Python package with bundled assets)
build: build-frontend
    cd backend && uv build

# Run the backend dev server on a fixed port (pair with `just dev-frontend`)
dev-backend:
    cd backend && uv run diffroom --no-open --port 8765

# Run the Vite dev server (proxies /api to the backend on :8765)
dev-frontend:
    cd frontend && pnpm dev
