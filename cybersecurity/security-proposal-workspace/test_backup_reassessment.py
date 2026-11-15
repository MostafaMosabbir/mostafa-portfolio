import json
from pathlib import Path
import tempfile
import unittest

from demo_backup_reassessment import ASSESSMENT_DATE, build_demo
from proposal import InputError, SCHEMAS, evaluate, read_csv


SOURCE = Path(__file__).parent / "data"


class BackupReassessmentTests(unittest.TestCase):
    def test_stages_isolate_control_and_evidence_from_the_action(self):
        original = {path.name: path.read_bytes() for path in SOURCE.glob("*.csv")}
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "backup-demo"
            result = build_demo(SOURCE, output)
            before, ready, after = result["stages"]
            self.assertEqual(result["as_of"], "2026-10-28")
            self.assertEqual(
                [stage["summary"]["supported_drafts"] for stage in result["stages"]], [4, 4, 5]
            )
            self.assertEqual(
                [stage["summary"]["needs_work"] for stage in result["stages"]], [11, 11, 10]
            )
            self.assertEqual(before["requirement"], ready["requirement"])
            self.assertEqual(before["requirement"]["state"], "needs_work")
            self.assertIn("CTL-010: status is partial", before["requirement"]["gaps"][0])
            self.assertEqual(before["action"]["status"], "planned")
            self.assertEqual(ready["action"]["status"], "ready_for_review")
            self.assertEqual(ready["evidence"], before["evidence"])
            self.assertEqual(after["action"], ready["action"])
            self.assertEqual(after["requirement"]["state"], "supported_draft")
            self.assertEqual(after["requirement"]["gaps"], [])
            self.assertEqual(after["requirement"]["claims"][0]["evidence_ids"], ["EV-010"])
            self.assertEqual(after["evidence"]["reference"], "DEMO-RESTORE-REVIEW-010")
            self.assertEqual(after["evidence"]["reviewed_on"], "2026-10-27")

            findings = []
            page = (output / "index.html").read_text(encoding="utf-8")
            for stage in result["stages"]:
                reports = output / stage["folder"] / "reports"
                self.assertIn(f'{stage["folder"]}/reports/review.html#finding-REQ-010', page)
                self.assertIn('id="finding-REQ-010"', (reports / "review.html").read_text(encoding="utf-8"))
                assessment = json.loads((reports / "assessment.json").read_text(encoding="utf-8"))
                findings.append([
                    row for row in assessment["requirements"] if row["requirement_id"] != "REQ-010"
                ])
            self.assertEqual(len(findings[0]), 14)
            self.assertEqual(findings, [findings[0]] * 3)
            integrity = next(row for row in findings[2] if row["requirement_id"] == "REQ-015")
            self.assertEqual(integrity["state"], "needs_work")
            self.assertIn("future", integrity["gaps"][0])
            self.assertTrue(result["other_requirements_unchanged"])
            self.assertEqual(original, {path.name: path.read_bytes() for path in SOURCE.glob("*.csv")})
            with self.assertRaises(InputError):
                build_demo(SOURCE, output)

            # A previously reviewed restore losing approval must reopen the finding.
            final_data = output / "after" / "data"
            data = {kind: read_csv(final_data / f"{kind}.csv", kind) for kind in SCHEMAS}
            evidence = next(row for row in data["evidence"] if row["evidence_id"] == "EV-010")
            evidence["review_status"] = "rejected"
            row = next(row for row in evaluate(data, ASSESSMENT_DATE) if row["requirement_id"] == "REQ-010")
            self.assertEqual(row["state"], "needs_work")
            self.assertEqual(row["gaps"], ["EV-010: evidence has not passed recorded human review."])

    def test_portfolio_preview_has_stable_links_and_no_duplicate_reports(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "backup-reassessment-demo"
            result = build_demo(SOURCE, output, portfolio_preview=True)
            self.assertEqual({path.name for path in output.iterdir()}, {"index.html", "comparison.json"})
            self.assertEqual(json.loads((output / "comparison.json").read_text(encoding="utf-8")), result)
            page = (output / "index.html").read_text(encoding="utf-8")
            self.assertIn('href="../reports/review.html#finding-REQ-010"', page)
            self.assertIn('href="../evidence-examples/backup-restore.html"', page)
            self.assertIn('href="../../../projects/security-proposal-workspace/practice.html"', page)
            self.assertNotIn('href="after/reports/review.html', page)

    def test_output_inside_source_is_rejected(self):
        with self.assertRaisesRegex(InputError, "outside"):
            build_demo(SOURCE, SOURCE / "backup-demo")
