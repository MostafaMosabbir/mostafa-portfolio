/* This interface runs locally in the browser. It never sends records to a server.
   The assessment rules live in security-engine.js, separate from the page. */
(() => {
  'use strict';
  const engine = window.SecurityEngine;
  const root = document.getElementById('workspace');
  const form = document.getElementById('assessment-form');
  if (!engine || !root || !form) return;

  // Embedded views use the surrounding portfolio navigation. The only
  // information sent to the parent is the number of pixels needed for height.
  if (window.self !== window.top) {
    document.body.classList.add('workspace-embedded');
    const main = document.getElementById('main');
    let pendingResize = 0;
    function announceHeight() {
      pendingResize = 0;
      const height = Math.ceil(main.getBoundingClientRect().bottom + 8);
      if (location.origin !== 'null' && Number.isFinite(height) && height > 0) {
        window.parent.postMessage({type:'security-workspace-height', height}, location.origin);
      }
    }
    function scheduleHeight() {
      if (!pendingResize) pendingResize = requestAnimationFrame(announceHeight);
    }
    if ('ResizeObserver' in window) new ResizeObserver(scheduleHeight).observe(main);
    else new MutationObserver(scheduleHeight).observe(main, {childList:true, subtree:true, attributes:true, characterData:true});
    window.addEventListener('load', scheduleHeight);
    window.addEventListener('resize', scheduleHeight);
    scheduleHeight();
  }

  // Each field is a string to match the Python tool's CSV input model.
  const fields = {
    requirements: [
      { key:'requirement_id', label:'Requirement ID', required:true, placeholder:'REQ-001', pattern:'[A-Z][A-Z0-9-]{1,39}' },
      { key:'domain', label:'Domain', required:true, placeholder:'Protect' },
      { key:'priority', label:'Priority', options:['low','medium','high','critical'], required:true },
      { key:'requirement', label:'Requirement', required:true, type:'textarea', full:true },
      { key:'control_ids', label:'Mapped control IDs', placeholder:'CTL-001; CTL-002', full:true, help:'Separate multiple IDs with semicolons. Leave blank if no control is mapped.' },
      { key:'coverage_review', label:'Coverage review status', options:['pending','approved','rejected'], required:true },
      { key:'reviewer', label:'Coverage reviewer' },
      { key:'reviewed_on', label:'Coverage review date', type:'date' },
      { key:'framework', label:'Framework or source', required:true, placeholder:'NIST CSF' },
      { key:'framework_version', label:'Source version', required:true, placeholder:'2.0' },
      { key:'source_ref', label:'Source reference', required:true, placeholder:'PR.AA-03' },
      { key:'source_url', label:'Source URL (HTTPS)', required:true, type:'url', full:true, help:'Record the source location. The workspace will not open it.' }
    ],
    controls: [
      { key:'control_id', label:'Control ID', required:true, placeholder:'CTL-001', pattern:'[A-Z][A-Z0-9-]{1,39}' },
      { key:'title', label:'Control title', required:true },
      { key:'status', label:'Implementation status', options:['unknown','planned','partial','implemented','not_implemented'], required:true },
      { key:'owner', label:'Control owner' },
      { key:'target_date', label:'Target date if not implemented', type:'date' },
      { key:'evidence_ids', label:'Linked evidence IDs', placeholder:'EV-001; EV-002', help:'Separate multiple IDs with semicolons.' },
      { key:'statement', label:'Recorded control statement', type:'textarea', full:true }
    ],
    evidence: [
      { key:'evidence_id', label:'Evidence ID', required:true, placeholder:'EV-001', pattern:'[A-Z][A-Z0-9-]{1,39}' },
      { key:'title', label:'Evidence title', required:true },
      { key:'review_status', label:'Evidence review status', options:['pending','reviewed','rejected'], required:true },
      { key:'reference', label:'Evidence location or reference', full:true, help:'Text only. The workspace does not open this reference.' },
      { key:'reviewed_on', label:'Evidence review date', type:'date' }
    ]
  };
  const kinds = ['requirements', 'controls', 'evidence'];
  const labels = {requirements:'Requirement', controls:'Control', evidence:'Evidence'};
  const prefixes = {requirements:'REQ', controls:'CTL', evidence:'EV'};
  // The editor and importer share limits so a downloaded workspace can be reopened.
  const MAX_RECORDS = 500;
  const MAX_WORKSPACE_BYTES = 2 * 1024 * 1024;
  const lists = Object.fromEntries(kinds.map(kind => [kind, document.getElementById(`${kind}-list`)]));
  const asOf = document.getElementById('as-of');
  const maxAge = document.getElementById('max-age');
  const status = document.getElementById('review-status');
  const fileStatus = document.getElementById('file-status');
  const errorBox = document.getElementById('review-error');
  const results = document.getElementById('results');
  const reportButton = document.getElementById('download-report');
  const picker = document.getElementById('open-workspace');
  let data = {requirements:[], controls:[], evidence:[]};
  let lastReview = null;
  let unsaved = false;

  function today() {
    const d = new Date();
    const pad = value => String(value).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  function invalidateReview() {
    if (lastReview) status.textContent = 'Information changed. Review the assessment again before downloading a report.';
    lastReview = null;
    results.hidden = true;
    reportButton.hidden = true;
    errorBox.hidden = true;
  }

  // The browser warns before navigation or refresh when edits haven't been exported.
  window.addEventListener('beforeunload', event => {
    if (!unsaved) return;
    event.preventDefault();
    event.returnValue = '';
  });

  function blankRecord(kind) {
    const row = Object.fromEntries(fields[kind].map(field => [field.key, '']));
    const idKey = fields[kind][0].key;
    const existing = new Set(data[kind].map(item => item[idKey]));
    let number = 1;
    while (existing.has(`${prefixes[kind]}-${String(number).padStart(3, '0')}`)) number += 1;
    row[idKey] = `${prefixes[kind]}-${String(number).padStart(3, '0')}`;
    if (kind === 'requirements') { row.priority = 'medium'; row.coverage_review = 'pending'; }
    if (kind === 'controls') row.status = 'unknown';
    if (kind === 'evidence') row.review_status = 'pending';
    return row;
  }

  function makeField(kind, index, field, value) {
    const label = document.createElement('label');
    if (field.full) label.className = 'full';
    label.append(document.createTextNode(field.label + (field.required ? ' *' : '')));
    let input;
    if (field.options) {
      input = document.createElement('select');
      for (const optionValue of field.options) {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue.replaceAll('_', ' ');
        input.append(option);
      }
    } else if (field.type === 'textarea') {
      input = document.createElement('textarea');
      input.maxLength = 10000;
    } else {
      input = document.createElement('input');
      input.type = field.type || 'text';
      if (input.type !== 'date') input.maxLength = 2000;
    }
    input.name = `${kind}-${index}-${field.key}`;
    input.dataset.kind = kind;
    input.dataset.index = String(index);
    input.dataset.field = field.key;
    if (field.pattern) input.pattern = field.pattern;
    if (field.placeholder) input.placeholder = field.placeholder;
    if (field.required) input.required = true;
    input.value = value;
    label.append(input);
    if (field.help) {
      const note = document.createElement('small');
      note.textContent = field.help;
      label.append(note);
    }
    return label;
  }

  function renderRecords() {
    kinds.forEach(kind => {
      const list = lists[kind];
      list.replaceChildren();
      if (!data[kind].length) {
        const hint = document.createElement('p');
        hint.className = 'muted';
        hint.textContent = `No ${labels[kind].toLowerCase()} records added.`;
        list.append(hint);
        return;
      }
      data[kind].forEach((record, index) => {
        const card = document.createElement('article');
        card.className = 'record';
        const heading = document.createElement('div');
        heading.className = 'record-heading';
        const title = document.createElement('h3');
        title.textContent = `${labels[kind]} ${index + 1}`;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.dataset.removeKind = kind;
        remove.dataset.removeIndex = String(index);
        remove.textContent = `Remove ${labels[kind].toLowerCase()}`;
        remove.setAttribute('aria-label', `Remove ${labels[kind].toLowerCase()} ${index + 1}`);
        heading.append(title, remove);
        const grid = document.createElement('div');
        grid.className = 'fields';
        fields[kind].forEach(field => grid.append(makeField(kind, index, field, record[field.key])));
        card.append(heading, grid);
        list.append(card);
      });
    });
  }

  // Event delegation keeps editing logic small as visitors add and remove rows.
  form.addEventListener('input', event => {
    const input = event.target;
    if (input.dataset.kind && data[input.dataset.kind]?.[Number(input.dataset.index)]) {
      data[input.dataset.kind][Number(input.dataset.index)][input.dataset.field] = input.value;
    }
    unsaved = true;
    invalidateReview();
  });
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.dataset.kind && data[input.dataset.kind]?.[Number(input.dataset.index)]) {
      data[input.dataset.kind][Number(input.dataset.index)][input.dataset.field] = input.value;
    }
    unsaved = true;
    invalidateReview();
  });
  form.addEventListener('click', event => {
    const add = event.target.closest('[data-add]');
    if (add && kinds.includes(add.dataset.add)) {
      const kind = add.dataset.add;
      if (data[kind].length >= MAX_RECORDS) {
        fileStatus.textContent = `The limit is ${MAX_RECORDS} ${kind} records per workspace.`;
        return;
      }
      data[kind].push(blankRecord(kind));
      unsaved = true;
      renderRecords();
      invalidateReview();
      return;
    }
    const remove = event.target.closest('[data-remove-kind]');
    if (remove && kinds.includes(remove.dataset.removeKind)) {
      const kind = remove.dataset.removeKind;
      if (!window.confirm(`Remove this ${labels[kind].toLowerCase()} record?`)) return;
      data[kind].splice(Number(remove.dataset.removeIndex), 1);
      unsaved = true;
      renderRecords();
      invalidateReview();
    }
  });

  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], {type}));
    // Use the surrounding page's document when embedded, so its browser can
    // handle the download. The file contents are never sent to a server.
    let downloadDocument = document;
    try {
      if (window.self !== window.top && window.parent.location.origin === window.location.origin) {
        downloadDocument = window.parent.document;
      }
    } catch (_) { /* Other origins cannot access the surrounding page. */ }
    const link = downloadDocument.createElement('a');
    link.href = url;
    link.download = name;
    downloadDocument.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function snapshot() {
    return { format:'security-proposal-workspace', version:1,
      as_of:asOf.value, max_age_days:Number(maxAge.value), data };
  }

  document.getElementById('save-workspace').addEventListener('click', () => {
    try {
      const workspace = snapshot();
      // Reject anything the importer would refuse, while allowing incomplete
      // draft records and a blank assessment date to be saved and reopened.
      parseWorkspace(workspace);
      const content = JSON.stringify(workspace, null, 2) + '\n';
      if (new Blob([content], {type:'application/json'}).size > MAX_WORKSPACE_BYTES) {
        throw new Error('Workspace exceeds the 2 MB file limit. Reduce the information or split it into separate workspaces.');
      }
      download('security-workspace.json', content, 'application/json');
      // The browser cannot confirm a download succeeded, so keep the warning.
      fileStatus.textContent = 'Download requested. Check that the workspace file was saved before leaving.';
    } catch (error) {
      fileStatus.textContent = `Could not download workspace: ${error.message}`;
    }
  });

  // Date inputs silently clear invalid values, so validate before rendering.
  function validCalendarDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  // Check the entire imported shape before replacing anything in the form.
  function parseWorkspace(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        value.format !== 'security-proposal-workspace' || value.version !== 1 ||
        typeof value.as_of !== 'string' || !Number.isInteger(value.max_age_days) ||
        value.max_age_days < 1 || value.max_age_days > 36500 ||
        !value.data || typeof value.data !== 'object' || Array.isArray(value.data)) {
      throw new Error('This is not a supported workspace file.');
    }
    // An empty date is useful in an unfinished draft. A nonempty one must be
    // a real calendar date, or a date input would silently discard it on load.
    if (value.as_of && !validCalendarDate(value.as_of)) {
      throw new Error('Assessment date must be a valid date in YYYY-MM-DD format.');
    }
    const replacement = {};
    for (const kind of kinds) {
      if (!Array.isArray(value.data[kind]) || value.data[kind].length > MAX_RECORDS) throw new Error(`Invalid ${kind} records.`);
      const keys = fields[kind].map(field => field.key);
      replacement[kind] = value.data[kind].map(record => {
        if (!record || typeof record !== 'object' || Array.isArray(record) ||
            Object.keys(record).length !== keys.length ||
            keys.some(key => typeof record[key] !== 'string' || record[key].length > 10000)) {
          throw new Error(`Invalid ${kind} record.`);
        }
        // Keep blank fields available for drafts. Reject values the date and
        // select controls would otherwise display as blank after import.
        for (const field of fields[kind]) {
          const fieldValue = record[field.key];
          if (fieldValue && field.type === 'date' && !validCalendarDate(fieldValue)) {
            throw new Error(`${field.label} must be a valid date in YYYY-MM-DD format.`);
          }
          if (fieldValue && field.options && !field.options.includes(fieldValue)) {
            throw new Error(`${field.label} has an unrecognized value.`);
          }
        }
        return Object.fromEntries(keys.map(key => [key, record[key]]));
      });
    }
    return {data:replacement, asOf:value.as_of, maxAge:value.max_age_days};
  }

  picker.addEventListener('change', async () => {
    const file = picker.files?.[0];
    if (!file) return;
    if (file.size > MAX_WORKSPACE_BYTES) {
      fileStatus.textContent = 'Workspace file is too large. The limit is 2 MB.';
      picker.value = '';
      return;
    }
    try {
      const replacement = parseWorkspace(JSON.parse(await file.text()));
      if (!window.confirm('Replace the information currently on this page with the selected file?')) return;
      data = replacement.data;
      asOf.value = replacement.asOf;
      maxAge.value = String(replacement.maxAge);
      unsaved = false;
      renderRecords();
      invalidateReview();
      fileStatus.textContent = 'Workspace opened on this device.';
    } catch (error) {
      fileStatus.textContent = `Could not open workspace: ${error.message}`;
    } finally {
      picker.value = '';
    }
  });

  function addText(parent, tag, value) {
    const element = document.createElement(tag);
    element.textContent = value;
    parent.append(element);
    return element;
  }

  function renderReview(review) {
    results.replaceChildren();
    const summary = review.summary;
    addText(results, 'p', `${summary.requirements} requirements: ${summary.supported_drafts} supported drafts; ${summary.needs_work} need work.`);
    review.rows.forEach(row => {
      const card = document.createElement('article');
      card.className = `result ${row.state}`;
      addText(card, 'h3', `${row.requirement_id} / ${row.requirement}`);
      addText(card, 'p', row.state === 'supported_draft' ? 'Supported draft · Human review required' : 'Needs work');
      if (row.gaps.length) {
        const list = document.createElement('ul');
        row.gaps.forEach(gap => addText(list, 'li', gap));
        card.append(list);
      } else {
        addText(card, 'p', 'The recorded information passed these metadata checks. Evidence was not inspected.');
      }
      results.append(card);
    });
    results.hidden = false;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    errorBox.hidden = true;
    status.textContent = '';
    if (!form.reportValidity()) return;
    try {
      // CSV inputs are trimmed by the Python version; apply the same treatment.
      const cleaned = Object.fromEntries(kinds.map(kind => [kind,
        data[kind].map(record => Object.fromEntries(Object.entries(record).map(([key, value]) => [key, value.trim()]))) ]));
      const review = engine.evaluate(cleaned, asOf.value, Number(maxAge.value));
      lastReview = {review, data:cleaned, asOf:asOf.value, maxAge:Number(maxAge.value)};
      renderReview(review);
      reportButton.hidden = false;
      status.textContent = 'Review complete. Results require human review.';
    } catch (error) {
      results.hidden = true;
      reportButton.hidden = true;
      lastReview = null;
      errorBox.textContent = `Unable to review: ${error.message}`;
      errorBox.hidden = false;
    }
  });

  reportButton.addEventListener('click', () => {
    if (!lastReview) return;
    const {review, asOf:date, maxAge:days} = lastReview;
    const lines = ['SECURITY REVIEW DRAFT', '', `Assessment date: ${date}`,
      `Review freshness: ${days} days`, '',
      'Human review required. The tool checks recorded metadata only.',
      'Evidence files and safeguards were not independently inspected.', ''];
    for (const row of review.rows) {
      lines.push(`${row.requirement_id}: ${row.requirement}`, `State: ${row.state.replaceAll('_', ' ')}`);
      if (row.gaps.length) row.gaps.forEach(gap => lines.push(`  Review: ${gap}`));
      else lines.push('  Recorded information passed these metadata checks; human review remains required.');
      for (const claim of row.claims) {
        lines.push(`  ${claim.control_id}: ${claim.status}; owner: ${claim.owner || 'not recorded'}; evidence: ${claim.evidence_ids.join(', ') || 'not linked'}`);
      }
      lines.push('');
    }
    download('security-review-draft.txt', lines.join('\n'), 'text/plain;charset=utf-8');
  });

  asOf.value = today();
  data.requirements.push(blankRecord('requirements'));
  renderRecords();
  document.getElementById('initial-status').hidden = true;
  root.hidden = false;
})();
