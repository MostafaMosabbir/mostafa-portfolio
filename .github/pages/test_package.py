"""Exercise the Pages file boundary without touching the site or deploying."""

import os
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
import unittest

from package import GateError, MANIFEST, package


class PackageTests(unittest.TestCase):
    def setUp(self):
        scratch = TemporaryDirectory()
        self.addCleanup(scratch.cleanup)
        directory = Path(scratch.name)
        self.source = directory / "source"
        self.source.mkdir()
        self.output = directory / "site"
        self.git("init", "--quiet")
        self.write("index.html", "<h1>Example</h1>")
        self.write("assets/style.css", "body { color: green; }")
        self.write("local.md", "This file is outside the approved list.")
        self.git("add", "--", "index.html", "assets/style.css", "local.md")
        self.manifest("# Publish the home page and its stylesheet.\n\nindex.html\nassets/style.css\n")

    def git(self, *args, input=None):
        return subprocess.run(
            ["git", *args], cwd=self.source, check=True, capture_output=True, input=input, text=True,
        ).stdout.strip()

    def write(self, name, content):
        path = self.source / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def manifest(self, paths):
        self.write(MANIFEST, paths)

    def test_build_contains_only_approved_files(self):
        self.assertEqual(package(self.source, self.output, "build"), 2)
        self.assertEqual(package(self.source, self.output, "verify"), 2)
        self.assertEqual((self.output / "index.html").read_text(), "<h1>Example</h1>")
        self.assertEqual((self.output / "assets/style.css").read_text(), "body { color: green; }")
        self.assertFalse((self.output / "local.md").exists())

    def test_rejects_extra_package_file_or_directory(self):
        package(self.source, self.output, "build")
        extra = self.output / "extra.txt"
        extra.touch()
        with self.assertRaisesRegex(GateError, "Unapproved"):
            package(self.source, self.output, "verify")
        extra.unlink()
        extra.mkdir()
        with self.assertRaisesRegex(GateError, "Unapproved"):
            package(self.source, self.output, "verify")

    def test_rejects_missing_package_file(self):
        package(self.source, self.output, "build")
        (self.output / "index.html").unlink()
        with self.assertRaisesRegex(GateError, "missing"):
            package(self.source, self.output, "verify")

    def test_rejects_untracked_source(self):
        self.write("untracked.txt", "Example")
        self.manifest("index.html\nuntracked.txt\n")
        with self.assertRaisesRegex(GateError, "tracked regular file"):
            package(self.source, self.output, "build")
        self.assertFalse(self.output.exists())

    def test_rejects_missing_tracked_source(self):
        (self.source / "index.html").unlink()
        with self.assertRaises(FileNotFoundError):
            package(self.source, self.output, "build")
        self.assertFalse(self.output.exists())

    def test_rejects_unsafe_paths(self):
        for path in ("../file", "./file", "/file", "assets\\file", "assets//file",
                     "assets/*.css", "file:stream", "assets/file.", "assets/NUL.txt", ".env"):
            with self.subTest(path=path):
                self.manifest(f"index.html\n{path}\n")
                with self.assertRaisesRegex(GateError, "Unsafe or nonportable"):
                    package(self.source, self.output, "build")

    def test_rejects_duplicate_and_case_colliding_paths(self):
        for path in ("index.html", "INDEX.html", "Assets/other.css"):
            with self.subTest(path=path):
                self.manifest(f"index.html\nassets/style.css\n{path}\n")
                with self.assertRaisesRegex(GateError, "Duplicate|conflict by case"):
                    package(self.source, self.output, "build")

    def test_rejects_paths_listed_as_both_files_and_directories(self):
        self.manifest("index.html\nassets\nassets/style.css\n")
        with self.assertRaisesRegex(GateError, "file and a directory"):
            package(self.source, self.output, "build")

    def test_rejects_source_with_symlink_git_mode(self):
        link_content = self.git("hash-object", "-w", "--stdin", input="local.md")
        self.git("update-index", "--cacheinfo", f"120000,{link_content},index.html")
        with self.assertRaisesRegex(GateError, "tracked regular file"):
            package(self.source, self.output, "build")

    def test_rejects_package_symlink(self):
        package(self.source, self.output, "build")
        to_replace = self.output / "index.html"
        to_replace.unlink()
        try:
            to_replace.symlink_to(self.source / "index.html")
        except OSError as error:
            self.skipTest(f"This environment does not permit symlinks: {error}")
        with self.assertRaisesRegex(GateError, "Symbolic links"):
            package(self.source, self.output, "verify")

    def test_rejects_package_hard_link(self):
        package(self.source, self.output, "build")
        to_replace = self.output / "index.html"
        to_replace.unlink()
        try:
            os.link(self.source / "index.html", to_replace)
        except OSError as error:
            self.skipTest(f"This environment does not permit hard links: {error}")
        with self.assertRaisesRegex(GateError, "Hard links"):
            package(self.source, self.output, "verify")

    def test_requires_fresh_output_outside_checkout(self):
        with self.assertRaisesRegex(GateError, "outside"):
            package(self.source, self.source / "site", "build")
        self.output.mkdir()
        with self.assertRaises(FileExistsError):
            package(self.source, self.output, "build")


if __name__ == "__main__":
    unittest.main()
