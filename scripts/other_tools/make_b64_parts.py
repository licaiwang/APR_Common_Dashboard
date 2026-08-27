import base64
import hashlib
import math
import os
import subprocess
import sys


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def copy_to_clipboard(text):
    try:
        process = subprocess.Popen(["clip.exe"], stdin=subprocess.PIPE, text=True)
        process.communicate(input=text)
        return process.returncode == 0
    except Exception:
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python make_b64_parts.py <file> [num_parts] [copy_part_no]")
        print("Example: python make_b64_parts.py winflow_offline_py311.tar.gz 8")
        print("Example: python make_b64_parts.py winflow_offline_py311.tar.gz 8 1")
        sys.exit(1)

    file_path = sys.argv[1]
    num_parts = int(sys.argv[2]) if len(sys.argv) >= 3 else 8
    copy_part_no = int(sys.argv[3]) if len(sys.argv) >= 4 else None

    if not os.path.exists(file_path):
        print(f"ERROR: 找不到檔案: {file_path}", file=sys.stderr)
        sys.exit(1)

    file_size = os.path.getsize(file_path)
    chunk_size = math.ceil(file_size / num_parts)
    digest = sha256_file(file_path)

    base_name = os.path.basename(file_path)
    out_dir = f"{base_name}.b64parts"
    os.makedirs(out_dir, exist_ok=True)

    print(f"Input file: {file_path}", file=sys.stderr)
    print(f"Original size: {file_size} bytes", file=sys.stderr)
    print(f"SHA256: {digest}", file=sys.stderr)
    print(f"Parts: {num_parts}", file=sys.stderr)
    print(f"Chunk size: {chunk_size} bytes", file=sys.stderr)
    print(f"Output dir: {out_dir}", file=sys.stderr)

    manifest_path = os.path.join(out_dir, "manifest.txt")

    with open(file_path, "rb") as src, open(manifest_path, "w", encoding="utf-8") as manifest:
        manifest.write(f"filename={base_name}\n")
        manifest.write(f"size={file_size}\n")
        manifest.write(f"sha256={digest}\n")
        manifest.write(f"parts={num_parts}\n")

        for i in range(1, num_parts + 1):
            raw = src.read(chunk_size)
            if not raw:
                break

            b64 = base64.b64encode(raw).decode("ascii")
            part_name = f"part_{i:02d}_of_{num_parts:02d}.b64"
            part_path = os.path.join(out_dir, part_name)

            with open(part_path, "w", encoding="ascii") as f:
                # 每 76 字元換行，方便貼上，也比較不容易爆 terminal
                for j in range(0, len(b64), 76):
                    f.write(b64[j:j + 76] + "\n")

            manifest.write(f"{part_name} raw_size={len(raw)} b64_size={len(b64)}\n")

            print(
                f"Created {part_name}: raw={len(raw)} bytes, b64={len(b64)} chars",
                file=sys.stderr,
            )

    print("\nDONE.", file=sys.stderr)
    print(f"Manifest: {manifest_path}", file=sys.stderr)

    if copy_part_no is not None:
        part_name = f"part_{copy_part_no:02d}_of_{num_parts:02d}.b64"
        part_path = os.path.join(out_dir, part_name)

        if not os.path.exists(part_path):
            print(f"ERROR: part not found: {part_path}", file=sys.stderr)
            sys.exit(1)

        with open(part_path, "r", encoding="ascii") as f:
            text = f.read()

        ok = copy_to_clipboard(text)
        if ok:
            print(f"Copied {part_name} to clipboard.", file=sys.stderr)
        else:
            print(f"Failed to copy {part_name} to clipboard.", file=sys.stderr)


if __name__ == "__main__":
    main()