import hashlib
from pathlib import Path
import tempfile
import unittest

from demo_reassessment import build_demo
from proposal import InputError


class ReassessmentTests(unittest.TestCase):
    def test_demo_isolated_and_expected_results(self):
        source = Path(__file__).parent / "data"
        hashes = lambda: {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in source.glob('*.csv')}
        before = hashes()
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as temp:
            output = Path(temp) / "demo"
            result = build_demo(source, output)
            self.assertEqual([s['summary']['supported_drafts'] for s in result['stages']], [4, 4, 5])
            self.assertEqual([s['summary']['needs_work'] for s in result['stages']], [11, 11, 10])
            self.assertTrue(result['other_requirements_unchanged'])
            self.assertEqual(hashes(), before)
            self.assertTrue((output / 'index.html').exists())
            with self.assertRaises(InputError):
                build_demo(source, output)
