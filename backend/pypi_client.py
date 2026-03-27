"""PyPI package downloader and extractor."""
import io
import tarfile
import zipfile
from pathlib import Path
from typing import Optional

import httpx
from packaging.version import Version, InvalidVersion

CACHE_DIR = Path.home() / ".cache" / "pypi-diff"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

PYPI_BASE = "https://pypi.org/pypi"


async def get_versions(package_name: str) -> list[str]:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{PYPI_BASE}/{package_name}/json")
        resp.raise_for_status()
        data = resp.json()

    versions: list[tuple[Version, str]] = []
    for v_str in data["releases"]:
        try:
            versions.append((Version(v_str), v_str))
        except InvalidVersion:
            pass

    versions.sort(key=lambda x: x[0])
    return [v[1] for v in versions]


def _best_artifact(urls: list[dict]) -> Optional[dict]:
    """Pick the best artifact: prefer pure-Python wheel, then any wheel, then sdist."""
    pure_wheel: Optional[dict] = None
    any_wheel: Optional[dict] = None
    sdist: Optional[dict] = None

    for u in urls:
        pkg_type = u.get("packagetype", "")
        filename = u.get("filename", "")
        if pkg_type == "bdist_wheel":
            if "none-any" in filename and pure_wheel is None:
                pure_wheel = u
            if any_wheel is None:
                any_wheel = u
        elif pkg_type == "sdist" and sdist is None:
            sdist = u

    return pure_wheel or any_wheel or sdist


async def download_package(package_name: str, version: str) -> tuple[Path, str]:
    """Download (and cache) a package. Returns (archive_path, artifact_type)."""
    cache_key = f"{package_name}-{version}"
    cache_dir = CACHE_DIR / cache_key

    # Return cached file if present
    if cache_dir.exists():
        for f in cache_dir.iterdir():
            artifact_type = "wheel" if f.suffix == ".whl" else "sdist"
            return f, artifact_type

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{PYPI_BASE}/{package_name}/{version}/json")
        resp.raise_for_status()
        data = resp.json()

    artifact = _best_artifact(data.get("urls", []))
    if not artifact:
        raise ValueError(f"No downloadable artifacts for {package_name}=={version}")

    cache_dir.mkdir(parents=True, exist_ok=True)
    archive_path = cache_dir / artifact["filename"]

    async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
        resp = await client.get(artifact["url"])
        resp.raise_for_status()
        archive_path.write_bytes(resp.content)

    artifact_type = "wheel" if artifact["packagetype"] == "bdist_wheel" else "sdist"
    return archive_path, artifact_type


def _is_binary(data: bytes) -> bool:
    return b"\x00" in data[:8000]


def extract_package(archive_path: Path) -> dict[str, bytes]:
    """
    Extract a package archive and return a normalized {path: content} mapping.
    - Wheels (.whl): skip .dist-info/
    - Sdists (.tar.gz): strip top-level directory
    """
    name = archive_path.name
    files: dict[str, bytes] = {}

    if name.endswith(".whl"):
        with zipfile.ZipFile(archive_path) as zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue
                # Skip wheel metadata
                parts = Path(info.filename).parts
                if any(p.endswith(".dist-info") or p.endswith(".data") for p in parts):
                    continue
                files[info.filename] = zf.read(info.filename)

    elif name.endswith((".tar.gz", ".tgz")):
        with tarfile.open(archive_path, "r:gz") as tf:
            for member in tf.getmembers():
                if not member.isfile():
                    continue
                parts = Path(member.name).parts
                # Strip top-level directory (e.g. "requests-2.28.0/")
                rel_parts = parts[1:] if len(parts) > 1 else parts
                if not rel_parts:
                    continue
                rel_path = "/".join(rel_parts)
                f = tf.extractfile(member)
                if f:
                    files[rel_path] = f.read()

    elif name.endswith(".zip"):
        with zipfile.ZipFile(archive_path) as zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue
                parts = Path(info.filename).parts
                rel_parts = parts[1:] if len(parts) > 1 else parts
                rel_path = "/".join(rel_parts)
                files[rel_path] = zf.read(info.filename)

    return files
