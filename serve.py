#!/usr/bin/env python3
"""Serve dashboard from dist/. Web reads JSON under dist/design and dist/uploads/<process>/<project>/."""

from __future__ import annotations

import argparse
import json
import urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def _safe_segment(name: str) -> str | None:
    if not name or name in {".", ".."}:
        return None
    if "/" in name or "\\" in name or "\x00" in name:
        return None
    return name


def project_upload_dir(dist_dir: Path, process: str, project: str) -> Path | None:
    process = _safe_segment(process)
    project = _safe_segment(project)
    if not process or not project:
        return None
    root = (dist_dir / "uploads").resolve()
    target = (root / process / project).resolve()
    try:
        target.relative_to(root)
    except ValueError:
        return None
    return target


def list_json_names(folder: Path) -> list[str]:
    if not folder.is_dir():
        return []
    return sorted(p.name for p in folder.glob("*.json") if p.is_file())


class DashboardHandler(SimpleHTTPRequestHandler):
    dist_dir: Path = Path(".")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(self.dist_dir), **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        if path == "/api/catalog":
            self._send_catalog()
            return
        if path.startswith("/api/uploads/"):
            parts = [urllib.parse.unquote(p) for p in path[len("/api/uploads/") :].split("/") if p]
            if len(parts) != 2:
                self.send_error(404, "Expected /api/uploads/<process>/<project>")
                return
            self._send_project_uploads(parts[0], parts[1])
            return
        return super().do_GET()

    def _send_json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_catalog(self):
        design_dir = self.dist_dir / "design"
        self._send_json(
            {
                "design": list_json_names(design_dir),
            }
        )

    def _send_project_uploads(self, process: str, project: str) -> None:
        folder = project_upload_dir(self.dist_dir, process, project)
        if folder is None:
            self._send_json({"error": "invalid process or project"}, status=400)
            return
        self._send_json({"uploads": list_json_names(folder)})


def parse_args() -> argparse.Namespace:
    here = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description="Serve APR dashboard from dist/")
    parser.add_argument("--dir", type=Path, default=here / "dist")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8080)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    root = args.dir.resolve()
    if not root.is_dir():
        raise SystemExit("dist not found: {}".format(root))

    DashboardHandler.dist_dir = root
    ThreadingHTTPServer.allow_reuse_address = True
    try:
        httpd = ThreadingHTTPServer((args.host, args.port), DashboardHandler)
    except OSError as exc:
        raise SystemExit("port {} already in use: {}".format(args.port, exc)) from exc
    with httpd:
        print("Serving {}".format(root), flush=True)
        print("Catalog: http://127.0.0.1:{}/api/catalog".format(args.port), flush=True)
        print("Uploads: http://127.0.0.1:{}/api/uploads/<process>/<project>".format(args.port), flush=True)
        print("Open:    http://127.0.0.1:{}/".format(args.port), flush=True)
        print("JSON dirs: design/  uploads/<process>/<project>/", flush=True)
        print("Press Ctrl+C to stop.", flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
