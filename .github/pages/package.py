"""Prepare and verify the exact file inventory for a Pages deployment."""

import argparse
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ".github/pages/approved-files.txt"
PORTABLE_NAME = re.compile(r"[A-Za-z0-9_][A-Za-z0-9_.-]*\Z")
WINDOWS_DEVICE = re.compile(r"(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])\Z", re.I)


class GateError(Exception):
    pass


def read_manifest(root):
    files = set()
    spellings = {}
    for number, line in enumerate((root / MANIFEST).read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        parts = line.split("/")
        for part in parts:
            if (not PORTABLE_NAME.fullmatch(part) or part.endswith(".")
                    or WINDOWS_DEVICE.fullmatch(part.split(".", 1)[0])):
                raise GateError(f"Unsafe or nonportable path on manifest line {number}.")
        path = PurePosixPath(*parts)
        if path in files:
            raise GateError(f"Duplicate approved path: {path}")
        for item in (path, *path.parents[:-1]):
            key = item.as_posix().casefold()
            if spellings.setdefault(key, item) != item:
                raise GateError(f"Approved paths conflict by case: {spellings[key]} and {item}")
        files.add(path)
    if PurePosixPath("index.html") not in files:
        raise GateError("The approved list must include index.html.")
    directories = {parent for path in files for parent in path.parents if parent != PurePosixPath(".")}
    if files & directories:
        raise GateError("An approved path is listed as both a file and a directory.")
    return files, directories


def tracked_regular_files(root):
    scan = subprocess.run(
        ["git", "ls-files", "--stage", "-z"], cwd=root, check=True, capture_output=True,
    )
    regular = set()
    for record in scan.stdout.split(b"\0"):
        if record:
            info, name = record.split(b"\t", 1)
            mode, _, stage = info.split()
            if stage == b"0" and mode in (b"100644", b"100755"):
                regular.add(name.decode("utf-8", "surrogateescape"))
    return regular


def entry_mode(path):
    info = path.lstat()
    if (stat.S_ISLNK(info.st_mode)
            or getattr(info, "st_file_attributes", 0) & stat.FILE_ATTRIBUTE_REPARSE_POINT):
        raise GateError(f"Symbolic links and reparse points are disallowed: {path.name}")
    if stat.S_ISREG(info.st_mode) and info.st_nlink > 1:
        raise GateError(f"Hard links are disallowed: {path.name}")
    return info.st_mode


def package_path(root, output):
    output = output.absolute()
    if output.name in ("", ".", ".."):
        raise GateError("Choose a named package directory outside the checkout.")
    output = output.parent.resolve(strict=True) / output.name
    if output.is_relative_to(root):
        raise GateError("The package directory must be outside the source checkout.")
    return output


def approved_source(root, relative):
    path = root
    for folder in relative.parts[:-1]:
        path /= folder
        if not stat.S_ISDIR(entry_mode(path)):
            raise GateError(f"Expected a source directory for {relative}.")
    path /= relative.name
    if not stat.S_ISREG(entry_mode(path)):
        raise GateError(f"Expected a regular source file: {relative}")
    return path


def verify_inventory(output, files, directories):
    if not stat.S_ISDIR(entry_mode(output)):
        raise GateError("The package must be a regular directory.")
    found = set()
    pending = [output]
    while pending:
        for path in pending.pop().iterdir():
            relative = PurePosixPath(path.relative_to(output).as_posix())
            mode = entry_mode(path)
            if stat.S_ISDIR(mode) and relative in directories:
                pending.append(path)
            elif stat.S_ISREG(mode) and relative in files:
                found.add(relative)
            else:
                raise GateError(f"Unapproved file, directory, or special entry: {relative}")
    if files - found:
        raise GateError(f"Approved package file is missing: {min(files - found)}")


def package(root, output, operation):
    root = root.resolve(strict=True)
    output = package_path(root, output)
    files, directories = read_manifest(root)
    if operation == "build":
        tracked = tracked_regular_files(root)
        sources = {}
        for relative in sorted(files):
            if relative.as_posix() not in tracked:
                raise GateError(f"Approved source is not a tracked regular file: {relative}")
            sources[relative] = approved_source(root, relative)
        output.mkdir()
        for relative, source in sources.items():
            destination = output / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, destination)
    verify_inventory(output, files, directories)
    return len(files)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=("build", "verify"))
    parser.add_argument("output_dir", type=Path)
    options = parser.parse_args()
    try:
        total = package(ROOT, options.output_dir, options.operation)
    except (GateError, OSError, UnicodeError, subprocess.CalledProcessError) as error:
        print(f"Pages package blocked: {error}", file=sys.stderr)
        return 1
    print(f"Pages package verified: {total} approved files.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
