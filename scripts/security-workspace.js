/* This is a read-only view of the generated fictional assessment snapshot.
   The Python engine is not running in the visitor's browser. */
(() => {
  const root = document.getElementById('security-method');
  const data = window.securitySampleData;
  if (!root || !data || !Array.isArray(data.scenarios) || !data.scenarios.length) return;

  const picker = root.querySelector('[data-security-picker]');
  const flow = root.querySelector('[data-security-flow]');
  const heading = root.querySelector('[data-security-selected]');
  const date = root.querySelector('[data-security-date]');
  const values = Array.from(root.querySelectorAll('[data-security-value]'));
  if (!picker || !flow || !heading || !date || values.length !== 5) return;

  // Text from the assessment is always inserted as text, never interpreted as HTML.
  function display(scenario, button) {
    picker.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    heading.textContent = `${scenario.title} · ${scenario.requirement_id} · ${scenario.state.replaceAll('_', ' ')}`;
    const controls = scenario.claims.map(claim =>
      `${claim.control_id}: ${claim.status.replaceAll('_', ' ')}; owner: ${claim.owner || 'not recorded'}`);
    const evidence = scenario.claims.map(claim =>
      `${claim.control_id}: ${claim.evidence_ids.join(', ') || 'no evidence reference linked'}`);
    const actions = scenario.actions.map(action =>
      `${action.action_id}: ${action.action} (${action.status.replaceAll('_', ' ')})`);
    const groups = [
      [scenario.requirement],
      controls.length ? controls : ['No control mapped to this requirement.'],
      evidence.length ? evidence : ['No evidence traceable through a mapped control.'],
      scenario.gaps.length ? scenario.gaps : ['No gaps found by the metadata checks. Human review is still required.'],
      actions.length ? actions : ['No action recorded in this assessment.']
    ];
    values.forEach((element, index) => { element.textContent = groups[index].join(' '); });
  }

  const buttons = data.scenarios.map(scenario => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = scenario.title;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => display(scenario, button));
    picker.append(button);
    return button;
  });
  date.textContent = `Fictional sample assessed ${data.as_of}.`;
  display(data.scenarios[0], buttons[0]);
  picker.hidden = false;
  flow.hidden = false;
})();
