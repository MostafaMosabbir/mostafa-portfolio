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


class BackupNoteConsistencyTests(unittest.TestCase):
    def setUp(self):
        self.data = {kind: read_csv(SOURCE / f"{kind}.csv", kind) for kind in SCHEMAS}
        self.control = next(row for row in self.data["controls"] if row["control_id"] == "CTL-010")
        self.evidence = next(row for row in self.data["evidence"] if row["evidence_id"] == "EV-010")
        self.gap = (
            "CTL-010: restore notes describe unfinished work despite an implemented status. "
            "Reconcile the status and notes."
        )

    def restore_finding(self):
        return next(row for row in evaluate(self.data, ASSESSMENT_DATE) if row["requirement_id"] == "REQ-010")

    def test_status_only_keeps_finding_open_until_notes_are_reconciled(self):
        before = evaluate(self.data, ASSESSMENT_DATE)
        integrity = next(row for row in before if row["requirement_id"] == "REQ-015")
        self.assertEqual(sum(row["state"] == "supported_draft" for row in before), 4)
        self.control["status"] = "implemented"
        self.assertEqual(self.restore_finding()["gaps"], [self.gap])
        status_only = evaluate(self.data, ASSESSMENT_DATE)
        self.assertEqual(sum(row["state"] == "supported_draft" for row in status_only), 4)

        self.control.update(
            target_date="",
            statement="Protected backups cover the campaign files. A restore to a separate destination was completed and reviewed.",
        )
        self.evidence.update(reference="DEMO-RESTORE-REVIEW-010", reviewed_on="2026-10-27")
        after = evaluate(self.data, ASSESSMENT_DATE)
        self.assertEqual(self.restore_finding()["state"], "supported_draft")
        self.assertEqual(sum(row["state"] == "supported_draft" for row in after), 5)
        self.assertEqual(integrity, next(row for row in after if row["requirement_id"] == "REQ-015"))

    def test_explicit_current_unfinished_restore_notes_need_review(self):
        self.control["status"] = "implemented"
        statements = [
            "The restore exercise is incomplete.",
            "The restoration remains unfinished.",
            "Recovery testing is not yet complete.",
            "The restore has not yet been verified.",
            "The restore hasn't been completed.",
            "The restore isn\u2019t tested.",
            "Restore completed, but verification remains incomplete.",
            "The restore is complete but the verification is not yet complete.",
            "The restore\n exercise\t is still incomplete.",
        ]
        for statement in statements:
            with self.subTest(statement=statement):
                self.control["statement"] = statement
                finding = self.restore_finding()
                self.assertEqual(finding["state"], "needs_work")
                self.assertEqual(finding["gaps"], [self.gap])

    def test_negated_historical_and_unrelated_notes_avoid_false_findings(self):
        self.control["status"] = "implemented"
        statements = [
            "The restore is no longer incomplete.",
            "The restore is not incomplete.",
            "The restore was incomplete, but is now complete.",
            "The previous exercise was incomplete. The current restore completed.",
            "Incomplete files were excluded. The restore completed.",
            "The restore completed. Staff training is incomplete.",
            "A documented restore to a separate destination was reviewed.",
        ]
        for statement in statements:
            with self.subTest(statement=statement):
                self.control["statement"] = statement
                self.assertEqual(self.restore_finding()["state"], "supported_draft")

    def test_reconciled_notes_still_require_reviewed_current_evidence(self):
        self.control.update(status="implemented", statement="The restore was completed and reviewed.")
        self.evidence["review_status"] = "rejected"
        self.assertEqual(
            self.restore_finding()["gaps"],
            ["EV-010: evidence has not passed recorded human review."],
        )
        self.evidence.update(review_status="reviewed", reviewed_on="2025-01-01")
        self.assertEqual(
            self.restore_finding()["gaps"],
            ["EV-010: evidence review is stale under the selected freshness window."],
        )

    def test_contradiction_rule_follows_records_with_different_ids(self):
        requirement = next(row for row in self.data["requirements"] if row["requirement_id"] == "REQ-010")
        requirement.update(requirement_id="REQ-RESTORE", control_ids="CTL-RESTORE")
        self.control.update(control_id="CTL-RESTORE", status="implemented", evidence_ids="EV-RESTORE")
        self.evidence["evidence_id"] = "EV-RESTORE"
        findings = evaluate(self.data, ASSESSMENT_DATE)
        row = next(row for row in findings if row["requirement_id"] == "REQ-RESTORE")
        self.assertEqual(row["state"], "needs_work")
        self.assertEqual(row["gaps"], [self.gap.replace("CTL-010", "CTL-RESTORE")])
