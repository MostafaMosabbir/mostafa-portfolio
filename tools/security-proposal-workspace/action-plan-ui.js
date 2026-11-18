(() => {
  'use strict';

  const visibleLimit = 5;
  const priorities = ['critical', 'high', 'medium', 'low'];
  const dateFormat = new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'
  });

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function priorityLabel(priority) {
    return priority[0].toUpperCase() + priority.slice(1);
  }

  function summaryCell(label, value) {
    const cell = element('span', 'action-plan-cell');
    cell.append(element('span', 'action-plan-cell-label', label), value);
    return cell;
  }

  function editField(labelText, input) {
    const label = element('label', '', labelText);
    label.append(input);
    return label;
  }

  function createRow(item, apply) {
    const row = element('li');
    const details = element('details', 'action-plan-row');
    details.dataset.requirementId = item.requirement_id;
    const summary = element('summary');
    const title = element('span', 'action-plan-title');
    title.append(element('span', '', item.title || item.requirement),
      element('span', 'action-plan-ids', [item.requirement_id, item.action_id].filter(Boolean).join(' / ')));

    const priority = element('span', 'action-plan-priority');
    const owner = element('span');
    const due = element('span');
    summary.append(title, summaryCell('Priority', priority), summaryCell('Owner', owner), summaryCell('Due date', due));
    details.append(summary);
    row.append(details);

    const body = element('div', 'action-plan-detail');
    const description = element('dl', 'action-plan-explanation');
    const findings = element('div');
    const findingsList = element('ul');
    for (const gap of item.gaps) findingsList.append(element('li', '', gap));
    const findingsValue = element('dd');
    findingsValue.append(findingsList);
    findings.append(element('dt', '', 'Why this is open'), findingsValue);
    const evidence = element('div');
    evidence.append(element('dt', '', 'Evidence to review'), element('dd', '',
      item.verification_criteria || 'Review evidence that shows this requirement is met and record the result.'));
    description.append(findings, evidence);

    const editor = element('form', 'action-plan-editor');
    editor.setAttribute('aria-label', 'Edit action for ' + item.requirement_id);
    const priorityInput = element('select');
    priorityInput.name = 'priority';
    priorityInput.required = true;
    for (const value of priorities) {
      const option = element('option', '', priorityLabel(value));
      option.value = value;
      priorityInput.append(option);
    }
    const ownerInput = element('input');
    ownerInput.name = 'owner';
    ownerInput.type = 'text';
    ownerInput.maxLength = 80;
    ownerInput.placeholder = 'Unassigned';
    const dueInput = element('input');
    dueInput.name = 'due_date';
    dueInput.type = 'date';
    dueInput.min = '0001-01-01';
    dueInput.max = '9999-12-31';
    const submit = element('button', 'primary', 'Apply changes');
    submit.type = 'submit';
    const ownerField = editField('Owner', ownerInput);
    ownerField.className = 'action-plan-owner';
    editor.append(editField('Priority', priorityInput), ownerField, editField('Due date', dueInput), submit);
    body.append(description, editor);
    details.append(body);

    const action = {row, summary, item};

    function update() {
      priority.textContent = priorityLabel(item.priority);
      priority.dataset.level = item.priority;
      owner.textContent = item.owner || 'Unassigned';
      if (item.due_date) {
        const date = element('time', '', dateFormat.format(new Date(item.due_date + 'T00:00:00Z')));
        date.dateTime = item.due_date;
        due.replaceChildren(date);
      } else {
        due.textContent = 'No due date';
      }
    }

    priorityInput.value = item.priority;
    ownerInput.value = item.owner;
    dueInput.value = item.due_date;
    editor.addEventListener('submit', event => {
      event.preventDefault();
      const values = {priority: priorityInput.value, owner: ownerInput.value.trim(), due_date: dueInput.value};
      apply(action, values, update);
    });
    update();
    return action;
  }

  function render(container, items, save) {
    const heading = element('h2', '', 'Action plan');
    heading.id = 'action-plan-heading';
    container.classList.add('action-plan');
    container.setAttribute('aria-labelledby', heading.id);
    container.replaceChildren(heading);
    if (!items.length) {
      container.append(element('p', 'muted', 'No open findings need an action.'));
      return;
    }

    const note = element('p', 'muted',
      'Edits here assign work. Update the underlying records and run a new review to clear a finding. Use Download workspace to keep your edits.');
    const columns = element('div', 'action-plan-columns');
    columns.setAttribute('aria-hidden', 'true');
    for (const key of ['Action', 'Priority', 'Owner', 'Due date']) columns.append(element('span', '', key));
    const list = element('ul', 'action-plan-list');
    list.id = 'action-plan-rows';
    list.setAttribute('aria-label', 'Open finding actions');
    const toggle = element('button', 'action-plan-toggle');
    toggle.type = 'button';
    toggle.setAttribute('aria-controls', list.id);
    const notice = element('p', 'muted action-plan-notice');
    notice.setAttribute('role', 'status');
    let expanded = false;
    const actions = items.map(item => createRow({...item}, apply));

    function orderRows(keepVisible) {
      actions.sort((a, b) => priorities.indexOf(a.item.priority) - priorities.indexOf(b.item.priority) ||
        Number(!a.item.due_date) - Number(!b.item.due_date) ||
        a.item.due_date.localeCompare(b.item.due_date) ||
        a.item.requirement_id.localeCompare(b.item.requirement_id));
      if (keepVisible && actions.indexOf(keepVisible) >= visibleLimit) expanded = true;
      actions.forEach(({row}, index) => {
        row.hidden = !expanded && index >= visibleLimit;
        list.append(row);
      });
      toggle.hidden = actions.length <= visibleLimit;
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.textContent = expanded ? 'Show first ' + visibleLimit + ' actions' : 'Show all ' + actions.length + ' actions';
    }

    function apply(action, values, update) {
      if (!save(action.item.requirement_id, values)) {
        notice.textContent = 'Could not save the action for ' + action.item.requirement_id + '.';
        return;
      }
      Object.assign(action.item, values);
      update();
      orderRows(action);
      action.summary.focus();
      notice.textContent = 'Action updated for ' + action.item.requirement_id + '.';
    }

    toggle.addEventListener('click', () => {
      expanded = !expanded;
      orderRows();
    });
    container.append(note, columns, list, toggle, notice);
    orderRows();
  }

  window.SecurityActionPlan = {render};
})();
