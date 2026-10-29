"""Run with: python -m unittest -v (no third-party dependencies)."""
import copy
import csv
from datetime import date, timedelta
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import proposal as app
from make_sample import build


class AssessmentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="test-run-", dir=Path(__file__).parent)
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.data_dir = self.root / "data"
        build(self.data_dir)
        self.data = {kind: app.read_csv(self.data_dir / f"{kind}.csv", kind) for kind in app.SCHEMAS}
        self.day = date(2026, 10, 28)

    def first(self):
        return app.evaluate(self.data, self.day)[0]

    def test_sample_expected_results(self):
        rows = app.evaluate(self.data, self.day)
        self.assertEqual([r['requirement_id'] for r in rows if r['state']=='supported_draft'],
                         ['REQ-001','REQ-004','REQ-011','REQ-013'])
        self.assertEqual(len(rows), 15)

    def test_implementation_without_evidence_is_not_supported(self):
        self.data['controls'][0]['evidence_ids'] = ''
        self.assertEqual(self.first()['state'], 'needs_work')

    def test_all_mapped_controls_are_required(self):
        self.data['requirements'][0]['control_ids'] += ';CTL-003'
        self.assertTrue(any('partial' in g for g in self.first()['gaps']))

    def test_all_evidence_is_required(self):
        self.data['controls'][0]['evidence_ids'] += ';EV-014'
        self.assertEqual(self.first()['state'], 'needs_work')

    def test_pending_coverage_blocks_claim_even_with_current_evidence(self):
        self.data['requirements'][0]['coverage_review'] = 'pending'
        self.assertEqual(self.first()['state'], 'needs_work')

    def test_freshness_boundary(self):
        self.data['evidence'][0]['reviewed_on'] = (self.day-timedelta(days=180)).isoformat()
        self.assertEqual(self.first()['state'], 'supported_draft')
        self.data['evidence'][0]['reviewed_on'] = (self.day-timedelta(days=181)).isoformat()
        self.assertEqual(self.first()['state'], 'needs_work')

    def test_future_review_is_not_accepted(self):
        self.data['evidence'][0]['reviewed_on'] = '2026-10-29'
        self.assertTrue(any('future' in g for g in self.first()['gaps']))

    def test_invalid_rows_fail_closed(self):
        original = copy.deepcopy(self.data)
        for kind, key, value in [('controls','status','done'), ('requirements','priority','urgent'),
                                 ('evidence','reviewed_on','2026-02-30'),
                                 ('requirements','source_url','javascript:alert(1)'),
                                 ('controls','evidence_ids','EV-MISSING')]:
            with self.subTest(key=key):
                self.data = copy.deepcopy(original)
                self.data[kind][0][key] = value
                with self.assertRaises(app.InputError): self.first()

    def test_duplicate_ids_and_mappings_rejected(self):
        self.data['controls'].append(copy.deepcopy(self.data['controls'][0]))
        with self.assertRaises(app.InputError): self.first()
        with self.assertRaises(app.InputError): app.references('CTL-001;CTL-001')

    def test_missing_owner_and_overdue_target_are_reported(self):
        rows = app.evaluate(self.data, self.day)
        self.assertTrue(any('overdue' in g for g in rows[5]['gaps']))
        self.assertTrue(any('owner is missing' in g for g in rows[7]['gaps']))

    def test_csv_schema_and_broken_rows_rejected(self):
        path = self.root / 'bad.csv'
        path.write_text('wrong,header\na,b\n')
        with self.assertRaises(app.InputError): app.read_csv(path, 'evidence')
        path.write_text(','.join(app.SCHEMAS['evidence'])+'\nEV-001,only two\n')
        with self.assertRaises(app.InputError): app.read_csv(path, 'evidence')

    def test_exports_and_overwrite_guard(self):
        out = self.root/'reports'
        summary = app.generate(self.data_dir, out, self.day)
        self.assertEqual(summary['needs_work'],11)
        self.assertEqual(len(list(out.iterdir())),6)
        self.assertEqual(len(json.loads((out/'assessment.json').read_text())['requirements']),15)
        with self.assertRaises(app.InputError): app.generate(self.data_dir, out, self.day)
        app.generate(self.data_dir,out,self.day,overwrite=True)

    def test_hash_describes_parsed_snapshot_even_if_disk_changes(self):
        source=self.data_dir/'requirements.csv'
        expected=hashlib.sha256(source.read_bytes()).hexdigest()
        real_read=app.read_csv
        def change_after_snapshot(path,kind,raw=None):
            result=real_read(path,kind,raw)
            if kind=='requirements': source.write_bytes(b'changed after read')
            return result
        with patch.object(app,'read_csv',side_effect=change_after_snapshot):
            summary=app.generate(self.data_dir,self.root/'reports',self.day)
        self.assertEqual(summary['inputs']['requirements.csv'],expected)

    def test_rendered_input_cannot_become_html_or_spreadsheet_formula(self):
        self.data['requirements'][0]['requirement']='<script>alert(1)</script>'
        rows=app.evaluate(self.data,self.day)
        summary={'as_of':'2026-10-28','max_age_days':180,'scope':'Demo','requirements':15,'supported_drafts':4,'needs_work':11}
        rendered=app.render_review(rows,summary)
        self.assertNotIn('<script>',rendered)
        self.assertIn('&lt;script&gt;',rendered)
        path=self.root/'safe.csv'
        app.write_csv(path,['value'],[['=1+1'],['  @SUM(1)']])
        with path.open(encoding='utf-8-sig',newline='') as stream:
            values=list(csv.reader(stream))
        self.assertTrue(values[1][0].startswith("'"))
        self.assertTrue(values[2][0].startswith("'"))

    def test_empty_requirements_and_invalid_window_rejected(self):
        with self.assertRaises(app.InputError): app.evaluate(self.data,self.day,0)
        self.data['requirements']=[]
        with self.assertRaises(app.InputError): self.first()


if __name__ == '__main__':
    unittest.main()
