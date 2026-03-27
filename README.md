# PyPI Package Diff

Compare what was **actually shipped** to PyPI — not what's in the source repository.

A build step, a forgotten `.gitignore` entry, or a last-minute change can mean the published package looks nothing like the tagged commit. This tool downloads both versions directly from PyPI and diffs them file-by-file, so you always see the real artifact.

![PyPI Package Diff screenshot](https://placehold.co/900x500/0d1117/58a6ff?text=PyPI+Package+Diff)

## Features

- **File-by-file diff** — unified diff view with line numbers, add/remove highlighting, and hunk context, just like a pull request review
- **Change navigator** — left sidebar groups files into Added / Removed / Modified with per-file `+N −N` stats
- **Summary bar** — instant overview of how many files changed and what artifact type was compared (wheel vs sdist)
- **Shareable URLs** — every comparison is encoded in the URL (`?pkg=requests&v1=2.28.0&v2=2.29.0`), so you can bookmark or send a link
- **Download cache** — packages are cached at `~/.cache/pypi-diff/` so repeat comparisons are instant
- **Binary detection** — binary files are flagged without attempting a text diff
- **Dark / light mode** — toggle in the top-right corner; preference is saved in `localStorage` and defaults to the OS setting

## Tech stack

| Layer | Stack |
|---|---|
| Backend | Python · FastAPI · uvicorn |
| Package data | PyPI JSON API · `httpx` |
| Diffing | Python `difflib` (unified diff) |
| Frontend | React 18 · TypeScript · Vite |
| Styling | Plain CSS with CSS custom properties |

## Getting started

### Prerequisites

- Python 3.11+
- Node.js 18+

### Run locally

```bash
git clone https://github.com/you/py-package-diff
cd py-package-diff
./start.sh
```

The script creates the Python venv and installs npm packages on first run, then starts both servers:

| Service | URL |
|---|---|
| Frontend (Vite dev server) | http://localhost:5173 |
| Backend (FastAPI) | http://localhost:8000 |

The Vite dev server proxies `/api` requests to the backend, so the frontend just works.

### Manual setup

```bash
# Backend
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## API

```
GET /api/packages/{package}/versions
```
Returns the list of published versions for a package, oldest-first.

```
GET /api/packages/{package}/diff/{v1}/{v2}
```
Downloads both versions (cached), extracts them, and returns a structured diff.

**Response shape:**
```jsonc
{
  "package": "requests",
  "v1": "2.28.0",
  "v2": "2.29.0",
  "artifact_v1": "wheel",
  "artifact_v2": "wheel",
  "summary": { "added": 1, "removed": 0, "modified": 8, "total": 9 },
  "files": [
    {
      "path": "requests/utils.py",
      "status": "modified",       // "added" | "removed" | "modified"
      "is_binary": false,
      "diff": "--- a/requests/utils.py\n+++ ...",
      "stats": { "added_lines": 12, "removed_lines": 4 }
    }
  ]
}
```

## Artifact preference

For each version the backend prefers:
1. Pure-Python wheel (`*-none-any.whl`) — what most users actually install
2. Any wheel
3. Source distribution (sdist)

The artifact type used for each version is returned in the response and shown in the UI summary bar.

## Deploying to production

See the [Hosting guide](#) for a full walkthrough using nginx + systemd on a VPS, or a single-container deploy on Railway/Render.

**Quick Dockerfile:**
```dockerfile
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM python:3.11-slim
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Project structure

```
py-package-diff/
├── backend/
│   ├── main.py          # FastAPI app, API endpoints
│   ├── pypi_client.py   # PyPI download + extraction
│   ├── differ.py        # File comparison + diff generation
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx                     # Root — routing, theme, URL state
│   │   ├── api.ts                      # Typed fetch wrappers
│   │   ├── types.ts                    # Shared TypeScript types
│   │   └── components/
│   │       ├── SearchForm.tsx          # Package + version input
│   │       ├── DiffView.tsx            # Result layout (summary + sidebar + panel)
│   │       ├── SummaryBar.tsx          # Stats strip
│   │       ├── FileSidebar.tsx         # Changed files list
│   │       └── DiffPanel.tsx           # Unified diff renderer
│   └── vite.config.ts
└── start.sh             # One-command local dev startup
```

## Why not just diff the GitHub tags?

Source repositories are not always an accurate representation of what gets published:

- **Build steps** can generate or transform files (compiled extensions, vendored deps, minified assets)
- **`.gitignore`** may exclude files that are deliberately included in the package
- **Last-minute edits** before `twine upload` never make it back to the repo
- **Automation scripts** may modify files as part of the release pipeline

PyPI Package Diff treats the published artifact as the single source of truth.

## License

MIT
