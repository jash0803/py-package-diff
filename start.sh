#!/bin/bash
# PyPI Package Diff — start both backend and frontend
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Backend setup ──────────────────────────────────────────────
if [ ! -d "$ROOT/backend/.venv" ]; then
  echo "Creating Python venv…"
  python3 -m venv "$ROOT/backend/.venv"
  "$ROOT/backend/.venv/bin/pip" install -q -r "$ROOT/backend/requirements.txt"
fi

# ── Frontend setup ─────────────────────────────────────────────
if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "Installing npm packages…"
  (cd "$ROOT/frontend" && npm install)
fi

# ── Launch ────────────────────────────────────────────────────
echo ""
echo "  Backend  →  http://localhost:8000"
echo "  Frontend →  http://localhost:5173"
echo ""
echo "  Press Ctrl+C to stop."
echo ""

cleanup() {
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  exit 0
}
trap cleanup INT TERM

# Start backend
(cd "$ROOT/backend" && .venv/bin/uvicorn main:app --reload --port 8000) &
BACKEND_PID=$!

# Start frontend dev server
(cd "$ROOT/frontend" && npm run dev) &
FRONTEND_PID=$!

wait
