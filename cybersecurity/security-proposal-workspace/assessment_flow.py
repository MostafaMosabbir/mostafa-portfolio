"""Render a readable assessment flow from the current report data.

The flow is a view of evaluated records, not another assessment engine. It
does not independently examine evidence or change the underlying findings.
"""
import html

from scenario_names import SCENARIO_NAMES, scenario_name


def render_assessment_flow(rows, actions):
    """Show the five named sample scenarios when their actual text matches."""
    sample = [row for row in rows if row['requirement_id'] in SCENARIO_NAMES
              and row['requirement'] == SCENARIO_NAMES[row['requirement_id']][0]]
    if not sample:
        return ''
    escape = lambda value: html.escape(str(value), quote=True)
    buttons, panels = [], []
    for row in sample:
        rid = row['requirement_id']
        title = scenario_name(row)
        matching_actions = [action for action in actions if action['requirement_id'] == rid]
        controls = []
        evidence = []
        for claim in row['claims']:
            controls.append(f"{claim['control_id']}: {claim['status'].replace('_', ' ')}; owner: {claim['owner'] or 'not recorded'}")
            evidence.append(f"{claim['control_id']}: " + (', '.join(claim['evidence_ids']) or 'no evidence linked'))
        if not controls:
            controls = ['No control mapped to this requirement.']
            evidence = ['No evidence can be traced through a mapped control.']
        findings = row['gaps'] or ['No gaps detected by these metadata checks. Human review is still required.']
        next_actions = [f"{action['action']} ({action['status'].replace('_', ' ')})" for action in matching_actions]
        if not next_actions:
            next_actions = ['No action recorded in this assessment.']

        def step(label, items):
            return f'<div class="flow-step"><h4>{escape(label)}</h4><ul>' + ''.join(
                f'<li>{escape(item)}</li>' for item in items) + '</ul></div>'

        buttons.append(f'<button type="button" data-flow-target="flow-{escape(rid)}" aria-pressed="false">{escape(title)}</button>')
        steps = (step('Requirement', [row['requirement']]) + step('Control', controls)
                 + step('Evidence references', evidence) + step('Finding', findings)
                 + step('Next action', next_actions))
        panels.append(f'<article class="flow-panel" id="flow-{escape(rid)}"><h3>{escape(title)}</h3>'
                      f'<p>{escape(rid)} · {escape(row["state"].replace("_", " "))}</p>'
                      f'<div class="flow-steps">{steps}</div></article>')

    return '''<section class="assessment-flow" aria-labelledby="flow-title">
      <h2 id="flow-title">Follow the assessment</h2>
      <p>Explore the fictional sample from requirement to planned action. Evidence references and review labels are recorded metadata; the tool does not inspect evidence files.</p>
      <div class="flow-buttons" hidden aria-label="Choose a sample scenario">''' + ''.join(buttons) + '''</div>
      <div>''' + ''.join(panels) + '''</div>
      <style>
      .flow-buttons{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}
      .flow-buttons button{font:inherit;text-align:left;color:#eaf3ee;background:#10211a;border:1px solid #527466;border-radius:6px;padding:9px 12px}
      .flow-buttons button[aria-pressed="true"]{background:#a2e7c2;color:#102019}
      .flow-buttons button:focus-visible{outline:3px solid #86e4bf;outline-offset:3px}
      .flow-panel{margin:18px 0;padding:18px;border:1px solid #365449;border-radius:8px}
      .flow-panel h3{margin:0}.flow-panel p{color:#b5c8bd;margin:6px 0 14px}
      .flow-steps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
      .flow-step{background:#132b21;border-top:2px solid #86e4bf;padding:10px;overflow-wrap:anywhere}
      .flow-step h4{font-size:.8rem;color:#b8e7cb;margin:0 0 8px}.flow-step ul{padding-left:18px;margin:0}.flow-step li{margin:0 0 8px}
      @media(max-width:760px){.flow-steps{grid-template-columns:1fr}.flow-step{border-top:0;border-left:2px solid #86e4bf}}
      @media print{.flow-panel[hidden]{display:block!important}.flow-step{background:white;color:#111}.flow-step h4{color:#111}}
      </style>
      <script>
      (() => {
        const group = document.querySelector('.flow-buttons');
        const buttons = [...group.querySelectorAll('button')];
        const panels = [...document.querySelectorAll('.flow-panel')];
        function choose(button){
          buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
          panels.forEach(panel => { panel.hidden = panel.id !== button.dataset.flowTarget; });
        }
        buttons.forEach(button => button.addEventListener('click', () => choose(button)));
        if(buttons.length){choose(buttons[0]);group.hidden = false;}
      })();
      </script></section>'''
