import csv
import io
import copy
import unittest
from datetime import date
from pathlib import Path
import proposal
import remediation as r

class RemediationTests(unittest.TestCase):
    def setUp(self):
        root=Path(__file__).parent/'data'
        self.data={k:proposal.read_csv(root/f'{k}.csv',k) for k in proposal.SCHEMAS}
        self.rows=proposal.evaluate(self.data,date(2026,10,28))
        self.raw=(root/'actions.csv').read_bytes()
        self.actions=r.load_actions(self.raw,self.rows)

    def encode(self, actions):
        buf=io.StringIO();w=csv.DictWriter(buf,fieldnames=r.FIELDS);w.writeheader();w.writerows(actions)
        return buf.getvalue().encode()

    def test_bad_actions_rejected(self):
        for key,value in [('requirement_id','REQ-999'),('owner',''),('status','closed'),('due_date','2026-02-30')]:
            actions=copy.deepcopy(self.actions);actions[0][key]=value
            with self.assertRaises(ValueError):r.load_actions(self.encode(actions),self.rows)
        with self.assertRaises(ValueError):r.load_actions(self.encode(self.actions+[self.actions[0]]),self.rows)

    def test_ready_for_review_does_not_clear_finding(self):
        actions=copy.deepcopy(self.actions)
        for a in actions:a['status']='ready_for_review'
        r.load_actions(self.encode(actions),self.rows)
        self.assertEqual(sum(x['state']=='needs_work' for x in proposal.evaluate(self.data,date(2026,10,28))),11)

    def test_due_date_boundary(self):
        a=self.actions[0]
        self.assertNotIn('overdue',r.action_state(a,'2026-11-15'))
        self.assertIn('overdue',r.action_state(a,'2026-11-16'))

    def test_matrix_links_and_escaped_action_text(self):
        self.actions[0]['action']='<img src=x onerror=alert(1)>'
        view=r.render_matrix(self.rows,self.actions,'2026-10-28')
        self.assertNotIn('<img',view);self.assertIn('&lt;img',view)
        self.assertEqual(view.count('class="matrix-cell '),15)
        self.assertIn('href="#finding-REQ-007"',view)
        self.assertEqual(len(self.actions),11)

    def test_unplanned_findings_are_visible(self):
        view=r.render_matrix(self.rows,[],'2026-10-28')
        self.assertIn('without an action: REQ-002',view)
