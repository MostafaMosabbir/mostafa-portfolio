"""Build the homepage sample from the generated fictional assessment.

Run from the portfolio root after regenerating reports/assessment.json:
    python scripts/build_security_sample.py
The homepage reads the resulting file locally. It does not run an assessment.
"""
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
assessment = json.loads((root / 'cybersecurity/security-proposal-workspace/reports/assessment.json').read_text(encoding='utf-8'))
sample_requirements = {
    'REQ-007': ('Require MFA for the in-scope human advertising-account logins.', 'MFA Coverage Verification'),
    'REQ-008': ('Review freelancer permissions to client campaign folders.', 'Freelancer Access Review'),
    'REQ-010': ('Record protected campaign-file backups and a restore test.', 'Backup Restoration Testing'),
    'REQ-012': ('Correlate campaign account alerts with identity activity.', 'Alert Correlation Mapping'),
    'REQ-014': ('Keep a tamper-evident record of investigation actions.', 'Investigation Evidence Review'),
}
rows = {row['requirement_id']: row for row in assessment['requirements']}
scenarios = []
for rid, (expected, title) in sample_requirements.items():
    row = rows.get(rid)
    if row is None or row['requirement'] != expected:
        raise ValueError(f'{rid}: requirement does not match the fictional sample')
    scenarios.append({
        'title': title,
        'requirement_id': rid,
        'requirement': row['requirement'],
        'state': row['state'],
        'claims': row['claims'],
        'gaps': row['gaps'],
        'actions': [action for action in assessment['actions'] if action['requirement_id'] == rid],
    })
payload = {'as_of': assessment['summary']['as_of'], 'scenarios': scenarios}
destination = root / 'scripts/security-sample-data.js'
destination.write_text('// Generated from the fictional assessment. Do not enter real company data.\n'
                       'window.securitySampleData = ' + json.dumps(payload, indent=2, ensure_ascii=True)
                       + ';\n', encoding='utf-8')
print('Wrote fictional homepage sample:', destination)
