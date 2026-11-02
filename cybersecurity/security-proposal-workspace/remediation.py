"""Remediation planning stays separate from assessment conclusions.

Actions describe intended work. Only updated assessment inputs and a fresh run
can change a requirement result. This module never marks a control compliant.
"""
import csv
import io
import html
from datetime import date

FIELDS = ["action_id", "requirement_id", "action", "owner", "due_date", "status", "verification_criteria"]
STATUSES = {"planned", "in_progress", "ready_for_review"}

def load_actions(raw, rows):
    reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig")), strict=True)
    if reader.fieldnames != FIELDS:
        raise ValueError("actions.csv: incorrect columns")
    known = {r["requirement_id"] for r in rows}
    seen = set()
    actions = []
    for row in reader:
        if None in row or any(v is None for v in row.values()):
            raise ValueError("actions.csv: incorrect number of fields")
        row = {k: v.strip() for k, v in row.items()}
        if any(not v for v in row.values()):
            raise ValueError("actions.csv: every field is required")
        if row["action_id"] in seen or row["requirement_id"] not in known:
            raise ValueError("actions.csv: duplicate action ID or unknown requirement")
        seen.add(row["action_id"])
        if row["status"] not in STATUSES:
            raise ValueError("actions.csv: unsupported status")
        parsed = date.fromisoformat(row["due_date"])
        if parsed.isoformat() != row["due_date"]:
            raise ValueError("actions.csv: use YYYY-MM-DD dates")
        actions.append(row)
    return actions

def action_state(action, as_of):
    # Due today is not overdue. Ready for review still needs human attention.
    late = date.fromisoformat(action["due_date"]) < date.fromisoformat(as_of)
    return action["status"].replace("_", " ") + (" Â· overdue" if late else "")

def render_matrix(rows, actions, as_of):
    esc = lambda x: html.escape(str(x), quote=True)
    by_req = {r["requirement_id"]: [] for r in rows}
    for action in actions:
        by_req[action["requirement_id"]].append(action)
    domains = []
    for domain in dict.fromkeys(r["domain"] for r in rows):
        group = [r for r in rows if r["domain"] == domain]
        cells = "".join(f'<a class="matrix-cell {r["state"]}" data-state="{r["state"]}" href="#finding-{esc(r["requirement_id"])}"><b>{esc(r["requirement_id"])}</b><span>{esc(r["state"].replace("_", " "))}</span><small>{len(r["gaps"])} review items Â· {len(by_req[r["requirement_id"]])} actions</small></a>' for r in group)
        domains.append(f'<div class="matrix-domain"><h3>{esc(domain)}</h3><div class="matrix-cells">{cells}</div></div>')
    table = []
    for r in rows:
        for a in by_req[r["requirement_id"]]:
            table.append(f'<tr><th scope="row">{esc(a["action_id"])}<br><a href="#finding-{esc(r["requirement_id"])}">{esc(r["requirement_id"])}</a></th><td>{esc(a["action"])}<br><small>{esc(r["priority"])} priority</small></td><td>{esc(a["owner"])}</td><td>{esc(a["due_date"])}</td><td>{esc(action_state(a, as_of))}</td><td>{esc(a["verification_criteria"])}</td></tr>')
    unplanned = [r["requirement_id"] for r in rows if r["state"] == "needs_work" and not by_req[r["requirement_id"]]]
    notice = 'Requirements needing work without an action: ' + ', '.join(unplanned) if unplanned else 'Every requirement needing work has a planned action. That does not mean its findings are resolved.'
    return f'''<section aria-labelledby="matrix-title"><h2 id="matrix-title">Requirement matrix</h2>
    <p>Each tile is one selected requirement, grouped by its recorded domain. Open a tile to inspect the findings. These are counts, not framework coverage scores.</p>
    <label id="matrix-filter-wrap" hidden>Show <select id="matrix-filter"><option value="all">All requirements</option><option value="needs_work">Needs work</option><option value="supported_draft">Supported drafts</option></select></label>
    <p id="matrix-count" aria-live="polite">{len(rows)} requirements shown</p>
    {''.join(domains)}</section>
    <section aria-labelledby="actions-title"><h2 id="actions-title">Remediation register</h2>
    <p>Fictional actions and accountable roles. Ready for review is not verified completion. Edit actions.csv to update the plan; reassess the source records to change findings.</p>
    <p>{esc(notice)}</p><div class="table" tabindex="0" aria-label="Remediation actions, scroll horizontally on small screens"><table><caption>{len(actions)} recorded actions as of {esc(as_of)}</caption><thead><tr><th>Action / requirement</th><th>Next action</th><th>Owner</th><th>Due</th><th>Status</th><th>Verification criteria</th></tr></thead><tbody>{''.join(table)}</tbody></table></div></section>
    <style>.matrix-domain h3{{margin-bottom:8px}}.matrix-cells{{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}}.matrix-cell{{display:flex;flex-direction:column;padding:14px;border:1px solid #365449;border-left-width:4px;border-radius:6px;text-decoration:none;background:#10211a}}.matrix-cell.needs_work{{border-left-color:#edb767}}.matrix-cell.supported_draft{{border-left-color:#86e4bf}}.matrix-cell span,.matrix-cell small{{color:#d0ded7}}.matrix-cell[hidden]{{display:none}}.matrix-cell:hover{{background:#1e3e30}}select{{font:inherit;background:#10211a;color:#eaf3ee;padding:8px;border:1px solid #86e4bf}}#actions-title{{margin-top:36px}}td{{vertical-align:top}}details:target{{outline:2px solid #86e4bf;scroll-margin-top:20px}}</style>
    <script>
    // Filtering changes the view only; it never changes the assessment results.
    document.getElementById('matrix-filter-wrap').hidden=false;
    document.getElementById('matrix-filter').addEventListener('change',event=>{{
      let shown=0;document.querySelectorAll('.matrix-cell').forEach(cell=>{{
        cell.hidden=event.target.value!=='all' && cell.dataset.state!==event.target.value;
        if(!cell.hidden)shown++;
      }});
      document.getElementById('matrix-count').textContent=shown+' requirements shown';
    }});
    function openFinding(){{
      const target=document.getElementById(location.hash.slice(1));
      if(target && target.tagName==='DETAILS'){{target.open=true;target.scrollIntoView({{block:'start'}});target.querySelector('summary').focus({{preventScroll:true}});}}
    }}
    window.addEventListener('hashchange',openFinding);
    document.addEventListener('click',event=>{{if(event.target.closest('a[href^="#finding-"]'))setTimeout(openFinding,0);}});
    document.addEventListener('DOMContentLoaded',openFinding);
    </script>'''
