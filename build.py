#!/usr/bin/env python3
"""Build SPA into dist/ without wiping design/ or uploads/ JSON."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
from pathlib import Path


def count_json(folder: Path) -> int:
    if not folder.is_dir():
        return 0
    return sum(1 for p in folder.rglob("*.json") if p.is_file())


def run_npm_build(root: Path) -> None:
    npm = shutil.which("npm")
    if not npm:
        raise SystemExit("npm not found on PATH (need Node 22 + npm)")
    env = os.environ.copy()
    if not (root / "node_modules").is_dir():
        subprocess.check_call([npm, "ci"], cwd=str(root), env=env)
    subprocess.check_call([npm, "run", "build"], cwd=str(root), env=env)


def main() -> None:
    here = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description="Build APR dashboard into dist/")
    parser.add_argument("--out", type=Path, default=here / "dist")
    args = parser.parse_args()

    design = args.out / "design"
    uploads = args.out / "uploads"
    if not design.is_dir():
        raise SystemExit("missing {}. Put hierarchy JSON there.".format(design))
    if not uploads.is_dir():
        raise SystemExit(
            "missing {}. Put upload JSON under uploads/<process>/<project>/.".format(uploads)
        )

    design_before = count_json(design)
    uploads_before = count_json(uploads)

    data_dir = args.out / "data"
    if data_dir.exists():
        shutil.rmtree(data_dir)

    run_npm_build(here)
    print("Vite build -> {}".format(args.out.resolve()))

    design_after = count_json(design)
    uploads_after = count_json(uploads)
    if design_after != design_before or uploads_after != uploads_before:
        raise SystemExit(
            "REFUSING: build changed JSON counts "
            "(design {} -> {}, uploads {} -> {}). "
            "Vite must use emptyOutDir:false.".format(
                design_before, design_after, uploads_before, uploads_after
            )
        )

    print(
        "JSON preserved: {} design file(s), {} upload file(s)".format(
            design_after,
            uploads_after,
        )
    )


if __name__ == "__main__":
    main()
