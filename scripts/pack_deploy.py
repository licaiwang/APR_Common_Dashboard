#!/usr/bin/env python3
"""Pack the smallest runtime tarball for another host (Python 3 + this archive).

Includes:
  serve.py
  dist/index.html
  dist/assets/          (hashed JS/CSS; .map omitted unless --include-maps)
  dist/design/*.json
  dist/uploads/<process>/<project>/*.json

Does not include src/, node_modules/, docs, or the Vite toolchain.
Run `npm run build` (or `python build.py`) first so dist/assets is current.
"""

from __future__ import annotations

import argparse
import tarfile
from datetime import datetime, timezone
from pathlib import Path


def must_exist(path: Path, hint: str) -> None:
    if not path.exists():
        raise SystemExit("missing {} — {}".format(path, hint))


def add_file(tar: tarfile.TarFile, src: Path, arcname: Path) -> None:
    tar.add(src, arcname=str(arcname).replace("\\", "/"), recursive=False)


def main() -> None:
    here = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description="Create a deploy tarball (serve.py + dist runtime).")
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Output .tar.gz path (default: apr_dashboard-YYYYMMDD.tar.gz in repo root)",
    )
    parser.add_argument(
        "--include-maps",
        action="store_true",
        help="Keep Vite *.js.map files (larger; only needed for browser debugging)",
    )
    args = parser.parse_args()

    serve = here / "serve.py"
    dist = here / "dist"
    index = dist / "index.html"
    assets = dist / "assets"
    design = dist / "design"
    uploads = dist / "uploads"

    must_exist(serve, "required to run on the target host")
    must_exist(index, "run `npm run build` (or python build.py) first")
    must_exist(assets, "run `npm run build` (or python build.py) first")
    js = list(assets.glob("*.js"))
    css = list(assets.glob("*.css"))
    if not js or not css:
        raise SystemExit("dist/assets has no JS/CSS bundles — run `npm run build` first")
    must_exist(design, "put hierarchy JSON in dist/design/")
    must_exist(uploads, "put upload JSON in dist/uploads/<process>/<project>/")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    out = args.out or (here / "apr_dashboard-{}.tar.gz".format(stamp))
    out = out.resolve()
    prefix = Path("apr_dashboard")

    files: list[tuple[Path, Path]] = [(serve, prefix / "serve.py"), (index, prefix / "dist" / "index.html")]
    for path in sorted(assets.iterdir()):
        if not path.is_file():
            continue
        if path.suffix == ".map" and not args.include_maps:
            continue
        files.append((path, prefix / "dist" / "assets" / path.name))
    for path in sorted(design.glob("*.json")):
        files.append((path, prefix / "dist" / "design" / path.name))
    for path in sorted(uploads.rglob("*.json")):
        if not path.is_file():
            continue
        rel = path.relative_to(uploads)
        files.append((path, prefix / "dist" / "uploads" / rel))

    out.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(out, "w:gz") as tar:
        for src, arcname in files:
            add_file(tar, src, arcname)

    size_mb = out.stat().st_size / (1024 * 1024)
    print("Wrote {}".format(out))
    print("Files: {}  Size: {:.2f} MiB".format(len(files), size_mb))
    print("On the target host:")
    print("  tar -xzf {}".format(out.name))
    print("  cd apr_dashboard")
    print("  python3 serve.py --dir dist --port 8080")
    print("  # open http://127.0.0.1:8080/")


if __name__ == "__main__":
    main()
