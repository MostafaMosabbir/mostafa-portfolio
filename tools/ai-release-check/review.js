(() => {
  'use strict';
  const rules = window.AIReleaseRules;
  if (!rules) return;

  const modes = {
    sample: {
      title: 'Support reply assistant',
      description: 'A fictional IT team is reviewing an assistant that drafts and sends replies. The proposed launch has several unresolved risks.'
    },
    revised: {
      title: 'Support reply assistant after fixes',
      description: 'The same fictional team moved its credentials to the server, tested replies, and added approval before sending.'
    },
    blank: {
      title: 'Review your own release',
      description: 'Start with unverified answers. Record a result when you have evidence for that check.'
    }
  };
  const states = {
    block: {row: 'Blocker', total: 'Blockers'},
    review: {row: 'Needs review', total: 'Needs review'},
    pass: {row: 'Met', total: 'Checks met'},
    not_applicable: {row: 'Not applicable', total: 'Not applicable'}
  };
  const decisions = {
    hold: {title: 'Hold release', state: 'block', description: 'Address the blockers before asking for release approval.'},
    review: {title: 'Needs review', state: 'review', description: 'Collect the missing evidence before asking for release approval.'},
    signoff: {title: 'Ready for human signoff', state: 'pass', description: 'The recorded answers meet the checks that apply to this release.'}
  };
  const answers = Object.fromEntries(Object.entries(rules.scenarios).map(([key, value]) => [key, {...value}]));
  const get = id => document.getElementById(id);
  const buttons = [...document.querySelectorAll('[data-mode]')];
  const panels = new Map();
  let mode = 'sample';

  function create(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }

  for (const [index, check] of rules.checks.entries()) {
    const details = create('details', 'check');
    details.open = index === 0;
    const state = create('span', 'check-state');
    const summary = create('summary');
    summary.append(create('span', 'check-title', check.title), state);

    const body = create('div', 'check-body');
    const label = create('label', '', check.prompt);
    const select = create('select');
    select.id = `answer-${check.id}`;
    label.htmlFor = select.id;
    for (const {value, label: text} of check.options) {
      const option = create('option', '', text);
      option.value = value;
      select.append(option);
    }

    const evidence = create('p', 'evidence');
    evidence.id = `evidence-${check.id}`;
    evidence.append(create('strong', '', 'Evidence to look for'), ' ', check.evidence);
    const reason = create('p', 'check-reason');
    reason.id = `result-${check.id}`;
    select.setAttribute('aria-describedby', `${evidence.id} ${reason.id}`);
    body.append(label, select, evidence, reason);
    details.append(summary, body);
    get('check-list').append(details);
    panels.set(check.id, {select, state, reason});

    select.addEventListener('change', () => {
      answers[mode][check.id] = select.value;
      updateReview();
    });
  }

  function updateReview() {
    const review = rules.evaluate(answers[mode]);
    const decision = decisions[review.decision];
    const title = get('decision-title');
    const description = get('decision-description');
    if (title.textContent !== decision.title) title.textContent = decision.title;
    if (description.textContent !== decision.description) description.textContent = decision.description;
    title.dataset.state = decision.state;

    const segments = [];
    const totals = [];
    for (const [key, count] of Object.entries(review.counts)) {
      for (let i = 0; i < count; i++) {
        const segment = create('span');
        segment.dataset.state = key;
        segments.push(segment);
      }
      if (key === 'not_applicable' && !count) continue;
      const total = create('li');
      const number = create('span', 'total-number', String(count));
      number.dataset.state = key;
      total.append(number, create('span', 'total-label', states[key].total));
      totals.push(total);
    }
    get('status-meter').replaceChildren(...segments);
    get('counts').replaceChildren(...totals);

    for (const row of review.rows) {
      const panel = panels.get(row.id);
      panel.state.textContent = states[row.state].row;
      panel.state.dataset.state = row.state;
      panel.reason.textContent = row.reason;
    }
    const open = [...review.rows.filter(row => row.state === 'block'), ...review.rows.filter(row => row.state === 'review')];
    get('next-steps').replaceChildren(...open.slice(0, 3).map(row => create('li', '', row.nextStep)));
    get('next-steps').hidden = open.length === 0;
    get('signoff-note').hidden = open.length > 0;
  }

  function showMode(nextMode) {
    mode = nextMode;
    const scenario = modes[mode];
    get('scenario-title').textContent = scenario.title;
    get('scenario-description').textContent = scenario.description;
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    }
    for (const [id, panel] of panels) panel.select.value = answers[mode][id];
    updateReview();
  }

  for (const button of buttons) button.addEventListener('click', () => showMode(button.dataset.mode));
  get('download').addEventListener('click', () => {
    const review = rules.evaluate(answers[mode]);
    const lines = ['AI Release Check', modes[mode].title, '', decisions[review.decision].title,
      'This report reflects recorded answers and requires human review.', ''];
    for (const row of review.rows) {
      const check = rules.checks.find(item => item.id === row.id);
      const answer = check.options.find(option => option.value === answers[mode][row.id]);
      lines.push(check.title, states[row.state].row, answer.label, row.reason, `Next step. ${row.nextStep}`, '');
    }
    const url = URL.createObjectURL(new Blob([lines.join('\n')], {type: 'text/plain;charset=utf-8'}));
    const link = create('a');
    link.href = url;
    link.download = `ai-release-review-${mode}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  showMode('sample');
  get('workspace').hidden = false;
  get('load-error').hidden = true;

  // The only information sent to the Workbench is the rendered height.
  if (window.parent !== window && ['http:', 'https:'].includes(location.protocol)) {
    document.body.classList.add('review-embedded');
    const main = document.querySelector('main');
    let resizeFrame = 0;
    let lastHeight = 0;

    function announceHeight() {
      resizeFrame = 0;
      if (!main.getClientRects().length) return;
      const height = Math.ceil(main.getBoundingClientRect().bottom + window.scrollY);
      if (height <= 0 || height === lastHeight) return;
      lastHeight = height;
      window.parent.postMessage({type: 'ai-release-height', height}, location.origin);
    }

    function scheduleHeight() {
      if (!resizeFrame) resizeFrame = requestAnimationFrame(announceHeight);
    }

    if ('ResizeObserver' in window) new ResizeObserver(scheduleHeight).observe(main);
    else new MutationObserver(scheduleHeight).observe(main, {attributes: true, childList: true, subtree: true, characterData: true});
    window.addEventListener('resize', scheduleHeight);
    scheduleHeight();
  }
})();
