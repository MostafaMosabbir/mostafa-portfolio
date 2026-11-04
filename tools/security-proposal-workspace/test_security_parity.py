"""Compare browser assessment findings with the existing Python evaluator.

The test data is the bundled fictional marketing-company sample. These checks
do not inspect evidence files, certify compliance, or use workplace records.

Run with Python and Node installed:
    python test_security_parity.py

The script expects security-engine.js beside this file. Set PROPOSAL_DIR or
NODE_BIN if your copies are in different locations.
"""
from __future__ import annotations

import copy
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import unittest
from datetime import date, timedelta


HERE = Path(__file__).resolve().parent
WORKSPACE = HERE.parent.parent
PROPOSAL_DIR = Path(os.environ.get(
    'PROPOSAL_DIR', str(WORKSPACE / 'cybersecurity' / 'security-proposal-workspace')
))
ENGINE = Path(os.environ.get('SECURITY_ENGINE_JS', str(HERE / 'security-engine.js')))
NODE = os.environ.get('NODE_BIN') or shutil.which('node') or 'node'

spec = importlib.util.spec_from_file_location('security_proposal', PROPOSAL_DIR / 'proposal.py')
proposal = importlib.util.module_from_spec(spec)
spec.loader.exec_module(proposal)


def sample_data():
    """Load the project's actual fictional fixtures using its CSV parser."""
    return {kind: proposal.read_csv(PROPOSAL_DIR / 'data' / f'{kind}.csv', kind)
            for kind in proposal.SCHEMAS}


def record(data, kind, key, identity):
    return next(row for row in data[kind] if row[key] == identity)


def cases():
    """Create independent cases, changing one meaningful input at a time."""
    base = sample_data()
    items = []

    def add(name, change=None, as_of='2026-10-28', max_age=180):
        data = copy.deepcopy(base)
        if change:
            change(data)
        items.append({'name': name, 'data': data, 'as_of': as_of, 'max_age': max_age})

    def req(data, rid='REQ-007'):
        return record(data, 'requirements', 'requirement_id', rid)

    def control(data, cid='CTL-007'):
        return record(data, 'controls', 'control_id', cid)

    def evidence(data, eid='EV-007'):
        return record(data, 'evidence', 'evidence_id', eid)

    def link_mfa(data):
        control(data)['evidence_ids'] = 'EV-007'

    add('full fictional sample')
    add('MFA mapping added', link_mfa)
    add('blank owner', lambda d: control(d).__setitem__('owner', '  '))
    add('missing statement', lambda d: control(d).__setitem__('statement', ''))
    add('partial control with overdue target', lambda d: control(d).update(status='partial', target_date='2026-10-27'))
    add('partial control due today', lambda d: control(d).update(status='partial', target_date='2026-10-28'))
    add('partial control without target', lambda d: control(d).update(status='partial', target_date=''))
    add('unmapped requirement', lambda d: req(d).__setitem__('control_ids', ''))
    add('coverage pending', lambda d: req(d).__setitem__('coverage_review', 'pending'))
    add('coverage rejected', lambda d: req(d).__setitem__('coverage_review', 'rejected'))
    add('coverage reviewer missing', lambda d: req(d).__setitem__('reviewer', ''))
    add('coverage review missing date', lambda d: req(d).__setitem__('reviewed_on', ''))
    add('coverage review future date', lambda d: req(d).__setitem__('reviewed_on', '2026-10-29'))
    cutoff = (date(2026, 10, 28) - timedelta(days=180)).isoformat()
    stale = (date(2026, 10, 28) - timedelta(days=181)).isoformat()
    add('coverage exactly at freshness boundary', lambda d: req(d).__setitem__('reviewed_on', cutoff))
    add('coverage just beyond freshness boundary', lambda d: req(d).__setitem__('reviewed_on', stale))

    def evidence_case(status=None, when=None, reference=None):
        def change(data):
            link_mfa(data)
            ev = evidence(data)
            if status is not None:
                ev['review_status'] = status
            if when is not None:
                ev['reviewed_on'] = when
            if reference is not None:
                ev['reference'] = reference
        return change

    add('evidence pending', evidence_case(status='pending'))
    add('evidence rejected', evidence_case(status='rejected'))
    add('evidence without reference', evidence_case(reference=''))
    add('evidence without date', evidence_case(when=''))
    add('evidence future date', evidence_case(when='2026-10-29'))
    add('evidence freshness boundary', evidence_case(when=cutoff))
    add('evidence stale', evidence_case(when=stale))
    add('valid leap day', evidence_case(when='2024-02-29'), as_of='2024-03-01')
    add('invalid leap day', evidence_case(when='2025-02-29'))

    def multiple_controls(data):
        # CTL-008 lacks an owner in the sample, so AND semantics retain a gap.
        link_mfa(data)
        req(data)['control_ids'] = 'CTL-007;CTL-008'
    add('multiple controls require all to pass', multiple_controls)

    def multiple_evidence(data):
        # EV-009 is pending in the sample, so one reviewed record is not enough.
        control(data)['evidence_ids'] = 'EV-007;EV-009'
    add('multiple evidence records require all to pass', multiple_evidence)
    add('duplicate mapped control', lambda d: req(d).__setitem__('control_ids', 'CTL-007;CTL-007'))
    add('duplicate evidence mapping', lambda d: control(d).__setitem__('evidence_ids', 'EV-007;EV-007'))
    add('unknown control mapping', lambda d: req(d).__setitem__('control_ids', 'CTL-UNKNOWN'))
    add('unknown evidence mapping', lambda d: control(d).__setitem__('evidence_ids', 'EV-UNKNOWN'))
    add('duplicate record ID', lambda d: d['controls'].append(copy.deepcopy(control(d))))
    add('invalid lowercase ID', lambda d: control(d).__setitem__('control_id', 'ctl-007'))
    add('invalid coverage status', lambda d: req(d).__setitem__('coverage_review', 'maybe'))
    add('invalid control status', lambda d: control(d).__setitem__('status', 'complete'))
    add('invalid evidence status', lambda d: evidence(d).__setitem__('review_status', 'approved'))
    add('insecure source URL', lambda d: req(d).__setitem__('source_url', 'http://example.com'))
    add('missing required column', lambda d: req(d).pop('domain'))
    add('extra field', lambda d: req(d).__setitem__('extra', 'x'))
    add('non-string value', lambda d: req(d).__setitem__('reviewer', 3))
    add('no requirements', lambda d: d['requirements'].clear())
    add('zero freshness days', max_age=0)
    add('invalid assessment date', as_of='2026-02-29')
    return items


def browser_results(items):
    """Send all test cases over stdin to a single isolated Node process."""
    runner = r'''
const fs = require('fs');
const engine = require(process.argv[1]);
const items = JSON.parse(fs.readFileSync(0, 'utf8'));
const output = items.map(item => {
  const before = JSON.stringify(item.data);
  try {
    const result = engine.evaluate(item.data, item.as_of, item.max_age);
    return {ok: true, result, unchanged: before === JSON.stringify(item.data)};
  } catch (error) {
    return {ok: false, error: String(error.message), unchanged: before === JSON.stringify(item.data)};
  }
});
process.stdout.write(JSON.stringify(output));
'''
    proc = subprocess.run([str(NODE), '-e', runner, str(ENGINE)],
                          input=json.dumps(items), text=True, encoding='utf-8',
                          capture_output=True, check=True, timeout=30)
    return json.loads(proc.stdout)


class SecurityEngineParity(unittest.TestCase):
    def test_same_results_as_python_for_fictional_cases(self):
        items = cases()
        actuals = browser_results(items)
        self.assertEqual(len(actuals), len(items))
        for item, actual in zip(items, actuals):
            with self.subTest(case=item['name']):
                original = copy.deepcopy(item['data'])
                try:
                    rows = proposal.evaluate(item['data'], date.fromisoformat(item['as_of']), item['max_age'])
                    expected_success = True
                except (ValueError, TypeError, KeyError):
                    expected_success = False
                    rows = None
                self.assertEqual(item['data'], original, 'Python changed the test input')
                self.assertTrue(actual['unchanged'], 'Browser engine changed its input')
                self.assertEqual(actual['ok'], expected_success, actual.get('error', ''))
                if expected_success:
                    self.assertEqual(actual['result']['rows'], rows)
                    summary = actual['result']['summary']
                    supported = sum(row['state'] == 'supported_draft' for row in rows)
                    self.assertEqual(summary['requirements'], len(rows))
                    self.assertEqual(summary['supported_drafts'], supported)
                    self.assertEqual(summary['needs_work'], len(rows) - supported)
                    self.assertEqual(summary['gap_items'], sum(len(row['gaps']) for row in rows))
                    self.assertEqual(summary['as_of'], item['as_of'])
                    self.assertEqual(summary['max_age_days'], item['max_age'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
