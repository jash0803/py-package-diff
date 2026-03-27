"""Package comparison logic."""
import difflib
from pathlib import Path

MAX_DIFF_BYTES = 100_000  # Truncate diffs larger than this


def _is_binary(data: bytes) -> bool:
    return b"\x00" in data[:8000]


def _make_added_diff(path: str, content: bytes) -> str:
    try:
        text = content.decode("utf-8", errors="replace")
    except Exception:
        return ""
    lines = text.splitlines(keepends=True)
    diff = difflib.unified_diff(
        [],
        lines,
        fromfile="/dev/null",
        tofile=f"b/{path}",
        n=0,
    )
    return "".join(diff)


def _make_removed_diff(path: str, content: bytes) -> str:
    try:
        text = content.decode("utf-8", errors="replace")
    except Exception:
        return ""
    lines = text.splitlines(keepends=True)
    diff = difflib.unified_diff(
        lines,
        [],
        fromfile=f"a/{path}",
        tofile="/dev/null",
        n=0,
    )
    return "".join(diff)


def _make_modified_diff(path: str, old: bytes, new: bytes) -> str:
    try:
        text_old = old.decode("utf-8", errors="replace")
        text_new = new.decode("utf-8", errors="replace")
    except Exception:
        return ""
    lines_old = text_old.splitlines(keepends=True)
    lines_new = text_new.splitlines(keepends=True)
    diff = difflib.unified_diff(
        lines_old,
        lines_new,
        fromfile=f"a/{path}",
        tofile=f"b/{path}",
        n=3,
    )
    return "".join(diff)


def _line_stats(diff: str) -> dict:
    added = removed = 0
    for line in diff.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            added += 1
        elif line.startswith("-") and not line.startswith("---"):
            removed += 1
    return {"added_lines": added, "removed_lines": removed}


def compare_packages(
    files1: dict[str, bytes],
    files2: dict[str, bytes],
) -> list[dict]:
    all_paths = sorted(set(files1) | set(files2))
    results = []

    for path in all_paths:
        in_v1 = path in files1
        in_v2 = path in files2

        if in_v1 and not in_v2:
            content = files1[path]
            binary = _is_binary(content)
            diff = None if binary else _make_removed_diff(path, content)
            if diff and len(diff.encode()) > MAX_DIFF_BYTES:
                diff = diff.encode()[:MAX_DIFF_BYTES].decode(errors="replace") + "\n... (truncated)"
            results.append({
                "path": path,
                "status": "removed",
                "is_binary": binary,
                "diff": diff,
                "stats": _line_stats(diff) if diff else {"added_lines": 0, "removed_lines": 0},
            })

        elif not in_v1 and in_v2:
            content = files2[path]
            binary = _is_binary(content)
            diff = None if binary else _make_added_diff(path, content)
            if diff and len(diff.encode()) > MAX_DIFF_BYTES:
                diff = diff.encode()[:MAX_DIFF_BYTES].decode(errors="replace") + "\n... (truncated)"
            results.append({
                "path": path,
                "status": "added",
                "is_binary": binary,
                "diff": diff,
                "stats": _line_stats(diff) if diff else {"added_lines": 0, "removed_lines": 0},
            })

        else:
            c1, c2 = files1[path], files2[path]
            if c1 == c2:
                continue  # Unchanged — skip

            binary = _is_binary(c1) or _is_binary(c2)
            diff = None if binary else _make_modified_diff(path, c1, c2)
            if diff and len(diff.encode()) > MAX_DIFF_BYTES:
                diff = diff.encode()[:MAX_DIFF_BYTES].decode(errors="replace") + "\n... (truncated)"
            results.append({
                "path": path,
                "status": "modified",
                "is_binary": binary,
                "diff": diff,
                "stats": _line_stats(diff) if diff else {"added_lines": 0, "removed_lines": 0},
            })

    return results
