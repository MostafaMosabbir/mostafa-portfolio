"""Practice backup integrity and a single-file restore with fictional data."""

import argparse
import hashlib
import json
from pathlib import Path
import shutil


def sha256(path):
    """Return a digest of the file's bytes, regardless of its name or location."""
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def restore(backup, expected_hash, destination):
    # Check the backup first. A mismatch stops the operation before any copy.
    backup_hash = sha256(backup)
    if backup_hash != expected_hash:
        return {"result": "rejected_before_restore", "backup_sha256": backup_hash}

    # Exclusive creation keeps an existing destination safe even on a retry.
    with destination.open("xb") as restored, backup.open("rb") as source:
        shutil.copyfileobj(source, restored)
    restored_hash = sha256(destination)
    return {
        "result": "restored_and_matched" if restored_hash == expected_hash else "restore_hash_mismatch",
        "backup_sha256": backup_hash,
        "restored_sha256": restored_hash,
    }


def run_practice(output):
    # Refuse reuse of an existing output path. All material is generated here.
    output.mkdir(parents=True, exist_ok=False)
    directories = {name: output / name for name in ("original", "backup", "restore", "modified-backup")}
    for directory in directories.values():
        directory.mkdir()

    filename = "fictional-campaign.txt"
    original = directories["original"] / filename
    original.write_bytes(b"Fictional campaign notes\nAudience: sample group\nVersion: 1\n")
    expected_hash = sha256(original)
    (output / "original-sha256.txt").write_text(expected_hash + "\n", encoding="utf-8")

    backup = directories["backup"] / filename
    shutil.copyfile(original, backup)
    modified_backup = directories["modified-backup"] / filename
    modified_backup.write_bytes(backup.read_bytes() + b"Unexpected extra line\n")

    # Both candidates are compared to the digest recorded from the original.
    before_restore = (output / "original-sha256.txt").read_text(encoding="utf-8").strip()
    restored = directories["restore"] / filename
    refused = directories["restore"] / "rejected-candidate.txt"
    matching = restore(backup, before_restore, restored)
    mismatch = restore(modified_backup, before_restore, refused)

    result = {
        "scenario": "Local single-file practice with fictional data",
        "original_sha256": expected_hash,
        "matching_backup": {**matching, "destination_created": restored.is_file()},
        "modified_backup": {**mismatch, "destination_created": refused.is_file()},
    }
    (output / "restore-results.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True, help="New directory for the fictional files and results")
    args = parser.parse_args()
    try:
        result = run_practice(args.output)
    except OSError as error:
        parser.exit(2, f"Could not run restore practice: {error}\n")
    print("Matching backup:", result["matching_backup"]["result"])
    print("Modified backup:", result["modified_backup"]["result"])
    print("Results:", args.output.resolve() / "restore-results.json")
    if (result["matching_backup"]["result"] != "restored_and_matched"
            or result["modified_backup"]["result"] != "rejected_before_restore"
            or result["modified_backup"]["destination_created"]):
        parser.exit(1, "The practice run did not produce the expected outcomes.\n")
