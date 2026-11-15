from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from practice_restore import restore, run_practice, sha256


class PracticeRestoreTests(unittest.TestCase):
    def test_matching_copy_is_restored_and_modified_copy_never_written(self):
        with TemporaryDirectory() as directory:
            output = Path(directory) / "practice"
            result = run_practice(output)
            self.assertEqual(result["matching_backup"]["result"], "restored_and_matched")
            self.assertEqual(result["matching_backup"]["restored_sha256"], result["original_sha256"])
            self.assertTrue((output / "restore" / "fictional-campaign.txt").is_file())
            self.assertEqual(result["modified_backup"]["result"], "rejected_before_restore")
            self.assertFalse(result["modified_backup"]["destination_created"])
            self.assertFalse((output / "restore" / "rejected-candidate.txt").exists())
            with self.assertRaises(FileExistsError):
                run_practice(output)

    def test_successful_precheck_does_not_overwrite_an_existing_destination(self):
        with TemporaryDirectory() as directory:
            backup = Path(directory) / "backup.txt"
            destination = Path(directory) / "destination.txt"
            backup.write_bytes(b"expected backup")
            destination.write_bytes(b"existing independent copy")
            with self.assertRaises(FileExistsError):
                restore(backup, sha256(backup), destination)
            self.assertEqual(destination.read_bytes(), b"existing independent copy")
