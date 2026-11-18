/* This interface runs locally in the browser. It never sends records to a server.
   The assessment rules live in security-engine.js, separate from the page. */
(() => {
  'use strict';
  const engine = window.SecurityEngine;
  const root = document.getElementById('workspace');
  const form = document.getElementById('assessment-form');
  if (!engine || !root || !form) return;

  const viewButtons = [...root.querySelectorAll('[data-workspace-mode]')];
  const views = [...root.querySelectorAll('[data-workspace-view]')];
  function showMode(mode) {
    if (mode !== 'sample' && mode !== 'build') return;
    for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.workspaceMode === mode));
    for (const view of views) view.hidden = view.dataset.workspaceView !== mode;
  }
  for (const button of viewButtons) {
    button.addEventListener('click', () => showMode(button.dataset.workspaceMode));
  }

  // Embedded views use the surrounding portfolio navigation. The only
  // information sent to the parent is the number of pixels needed for height.
  if (window.self !== window.top) {
    document.body.classList.add('workspace-embedded');
    window.addEventListener('message', event => {
      if (event.source !== window.parent || event.origin !== location.origin) return;
      if (event.data?.type === 'security-workspace-mode') showMode(event.data.mode);
    });
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

  // HTML patterns use the RegExp v flag, which requires escaping literal hyphens.
  const idPattern = String.raw`[A-Z][A-Z0-9\-]{1,39}`;
  // Each field is a string to match the Python tool's CSV input model.
  const fields = {
    requirements: [
      { key:'requirement_id', label:'Requirement ID', required:true, placeholder:'REQ-001', pattern:idPattern },
      { key:'domain', label:'Domain', required:true, placeholder:'Protect' },
      { key:'priority', label:'Priority', options:['low','medium','high','critical'], required:true },
      { key:'requirement', label:'Requirement', required:true, type:'textarea', full:true, placeholder:'Staff verify their identity a second way when they sign in.' },
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
      { key:'control_id', label:'Control ID', required:true, placeholder:'CTL-001', pattern:idPattern },
      { key:'title', label:'Control title', required:true },
      { key:'status', label:'Implementation status', options:['unknown','planned','partial','implemented','not_implemented'], required:true },
      { key:'owner', label:'Control owner' },
      { key:'target_date', label:'Target date if not implemented', type:'date' },
      { key:'evidence_ids', label:'Linked evidence IDs', placeholder:'EV-001; EV-002', help:'Separate multiple IDs with semicolons.' },
      { key:'statement', label:'Recorded control statement', type:'textarea', full:true }
    ],
    evidence: [
      { key:'evidence_id', label:'Evidence ID', required:true, placeholder:'EV-001', pattern:idPattern },
      { key:'title', label:'Evidence title', required:true },
      { key:'review_status', label:'Evidence review status', options:['pending','reviewed','rejected'], required:true },
      { key:'reference', label:'Evidence location or reference', full:true, help:'Text only. The workspace does not open this reference.' },
      { key:'reviewed_on', label:'Evidence review date', type:'date' }
    ]
  };
  const kinds = ['requirements', 'controls', 'evidence'];
  const labels = {requirements:'Requirement', controls:'Control', evidence:'Evidence'};
  const prefixes = {requirements:'REQ', controls:'CTL', evidence:'EV'};
  const sampleGuides = {
    'CTL-007': 'Fictional MFA exercise: enter EV-007 in Linked evidence IDs.',
    'CTL-010': 'Fictional backup exercise: set the status to implemented, clear the target date, and record the reviewed restore.',
    'EV-010': 'Fictional backup exercise: enter DEMO-RESTORE-REVIEW-010 and set the review date to October 27, 2026.'
  };
  // The editor and importer share limits so a downloaded workspace can be reopened.
  const MAX_RECORDS = 500;
  const MAX_WORKSPACE_BYTES = 2 * 1024 * 1024;
  const lists = Object.fromEntries(kinds.map(kind => [kind, document.getElementById(`${kind}-list`)]));
  const asOf = document.getElementById('as-of');
  const maxAge = document.getElementById('max-age');
  const reviewButton = document.getElementById('review-assessment');
  const status = document.getElementById('review-status');
  const fileStatus = document.getElementById('file-status');
  const errorBox = document.getElementById('review-error');
  const results = document.getElementById('results');
  const reviewDownloads = document.getElementById('review-downloads');
  const reportButton = document.getElementById('download-report');
  const openFindingsButton = document.getElementById('download-open-findings');
  const picker = document.getElementById('open-workspace');
  const fullSample = document.getElementById('full-fictional-sample');
  const sampleButton = document.getElementById('load-fictional-sample');
  const sampleJumps = document.getElementById('sample-jumps');
  const sampleStatus = document.getElementById('sample-status');
  const comparison = document.getElementById('comparison');
  const comparisonStatus = document.getElementById('comparison-status');
  const comparisonTotals = document.getElementById('comparison-totals');
  const comparisonRows = document.getElementById('comparison-rows');
  const saveBaseline = document.getElementById('save-baseline');
  const clearBaseline = document.getElementById('clear-baseline');
  const compareReview = document.getElementById('compare-review');
  let data = {requirements:[], controls:[], evidence:[]};
  let lastReview = null;
  let baseline = null;
  let hasLoadedWorkspace = false;
  let unsaved = false;
  let needsWorkOnly = false;
  let recordReturn = null;

  function today() {
    const d = new Date();
    const pad = value => String(value).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  function invalidateReview() {
    if (lastReview) status.textContent = 'Information changed. Review the assessment again to download updated findings.';
    lastReview = null;
    results.hidden = true;
    reportButton.hidden = true;
    openFindingsButton.hidden = true;
    errorBox.hidden = true;
    if (recordReturn) recordReturn.textContent = 'Review changes';
    renderComparison();
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
    clearRecordJump();
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
        card.append(heading);
        const recordId = record[fields[kind][0].key];
        const guide = !sampleJumps.hidden && Object.hasOwn(sampleGuides, recordId) ? sampleGuides[recordId] : '';
        if (guide) addText(card, 'p', guide).className = 'record-guide';
        card.append(grid);
        if (guide) {
          const review = document.createElement('a');
          review.className = 'record-review-link';
          review.href = '#comparison';
          review.textContent = 'Back to comparison';
          review.addEventListener('click', event => {
            event.preventDefault();
            comparison.focus();
            comparison.scrollIntoView({block:'center'});
          });
          card.append(review);
        }
        list.append(card);
      });
    });
  }

  // Event delegation keeps editing logic small as visitors add and remove rows.
  function trackEdit(event) {
    const input = event.target;
    const {kind, index, field} = input.dataset;
    if (input !== asOf && input !== maxAge) {
      const record = data[kind]?.[Number(index)];
      if (!record || !Object.hasOwn(record, field)) return;
      record[field] = input.value;
    }
    unsaved = true;
    invalidateReview();
  }
  form.addEventListener('input', trackEdit);
  form.addEventListener('change', trackEdit);
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
        // Keep blank fields available for drafts. Reject values the editor
        // would drop or cannot review before replacing the open workspace.
        for (const field of fields[kind]) {
          const fieldValue = record[field.key];
          if (field.type !== 'textarea' && /[\r\n]/.test(fieldValue)) {
            throw new Error(`${field.label} must be a single line.`);
          }
          if (fieldValue && field.type === 'url' && !engine.validSourceUrl(fieldValue)) {
            throw new Error(`${field.label} must be a valid HTTPS URL.`);
          }
          if (fieldValue && field.type === 'date' && !validCalendarDate(fieldValue)) {
            throw new Error(`${field.label} must be a valid date in YYYY-MM-DD format.`);
          }
          if (fieldValue && field.options && !field.options.includes(fieldValue)) {
            throw new Error(`${field.label} has an unrecognized value.`);
          }
        }
        // Textarea controls normalize CR and CRLF to LF when rendering.
        return Object.fromEntries(fields[kind].map(({ key, type }) => [
          key, type === 'textarea' ? record[key].replace(/\r\n?/g, '\n') : record[key]
        ]));
      });
    }
    return {data:replacement, asOf:value.as_of, maxAge:value.max_age_days};
  }

  function replaceWorkspace(replacement, isSample) {
    data = replacement.data;
    asOf.value = replacement.asOf;
    maxAge.value = String(replacement.maxAge);
    unsaved = false;
    hasLoadedWorkspace = true;
    baseline = null;
    sampleJumps.hidden = !isSample;
    sampleStatus.textContent = '';
    renderRecords();
    invalidateReview();
    status.textContent = '';
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
      replaceWorkspace(replacement, false);
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

  function evaluateWorkspace(records, assessmentDate, freshnessDays) {
    // A review owns a new set of records. Replacing or editing the form
    // afterward cannot change a review that was saved as the baseline.
    const cleaned = Object.fromEntries(kinds.map(kind => [
      kind,
      records[kind].map(record => Object.fromEntries(
        fields[kind].map(({key}) => [key, record[key].trim()])
      ))
    ]));
    return {
      review: engine.evaluate(cleaned, assessmentDate, freshnessDays),
      data: cleaned,
      asOf: assessmentDate,
      maxAge: freshnessDays,
    };
  }

  function reviewedRows(snapshot) {
    const evidence = new Map(snapshot.data.evidence.map(record => [record.evidence_id, record]));
    return new Map(snapshot.review.rows.map(({control_ids, ...row}) => [
      row.requirement_id,
      {
        // The mapped controls are already represented in claims. Ignore
        // formatting differences in the raw list of control IDs.
        row,
        // The engine reports the evidence IDs. Include the linked records so
        // the comparison also catches a changed review with the same ID.
        evidence: row.claims.flatMap(claim => claim.evidence_ids.map(id => evidence.get(id))),
      }
    ]));
  }

  function renderTotals(label, snapshot) {
    const panel = document.createElement('div');
    const summary = snapshot.review.summary;
    addText(panel, 'h3', label);
    addText(panel, 'p', `${summary.supported_drafts} supported drafts · ${summary.needs_work} need work`);
    addText(panel, 'p', `${summary.requirements} requirements · ${snapshot.asOf} · ${snapshot.maxAge} days`).className = 'muted';
    comparisonTotals.append(panel);
  }

  function renderSide(sides, label, item, editable = false) {
    const panel = document.createElement('div');
    addText(panel, 'h4', label);
    sides.append(panel);
    if (!item) {
      addText(panel, 'p', 'Requirement absent');
      return;
    }
    const {row, evidence} = item;
    const byId = new Map(evidence.map(record => [record.evidence_id, record]));
    addText(panel, 'p', row.state === 'supported_draft' ? 'Supported draft' : 'Needs work').className = row.state;
    addText(panel, 'p', row.requirement);
    addText(panel, 'p', `${row.domain} · ${row.priority} priority · ${row.framework} ${row.framework_version} / ${row.source_ref}`).className = 'muted';
    addText(panel, 'p', row.source_url).className = 'muted';
    addText(panel, 'p', `Coverage review: ${row.coverage_review} · ${row.reviewer || 'Reviewer missing'} · ${row.reviewed_on || 'Date missing'}`).className = 'muted';
    // Keep evidence under its mapped control so relinking an ID is visible.
    for (const claim of row.claims) {
      const control = document.createElement('section');
      control.className = 'comparison-control';
      addText(control, 'h5', claim.control_id);
      addText(control, 'p', `${claim.status.replaceAll('_', ' ')} · ${claim.owner || 'Owner missing'}`);
      if (claim.statement) addText(control, 'p', claim.statement).className = 'muted';
      if (claim.target_date) addText(control, 'p', `Target date: ${claim.target_date}`).className = 'muted';
      if (!claim.evidence_ids.length) addText(control, 'p', 'No evidence linked').className = 'muted';
      for (const id of claim.evidence_ids) {
        const record = byId.get(id);
        addText(control, 'p', `${id} · ${record.title} · ${record.review_status} · ${record.reviewed_on || 'Date missing'}`);
        if (record.reference) addText(control, 'p', record.reference).className = 'muted';
      }
      panel.append(control);
    }
    if (row.gaps.length) {
      const gaps = document.createElement('ul');
      row.gaps.forEach(gap => addText(gaps, 'li', gap));
      panel.append(gaps);
    }
    if (editable) addRecordLinks(panel, row, comparison);
  }

  function renderComparison() {
    comparison.hidden = !lastReview && !baseline;
    saveBaseline.hidden = !lastReview || Boolean(baseline);
    clearBaseline.hidden = !baseline;
    compareReview.hidden = !baseline;
    comparisonTotals.replaceChildren();
    comparisonTotals.hidden = !baseline;
    comparisonRows.replaceChildren();
    if (!baseline) {
      comparisonStatus.textContent = lastReview ? 'Use this review as the baseline before editing.' : 'Load the fictional sample or run a review to start.';
      return;
    }
    renderTotals('Baseline', baseline);
    if (!lastReview) {
      comparisonStatus.textContent = 'Baseline kept. Review again to compare the current records.';
      return;
    }
    renderTotals('Current review', lastReview);
    if (baseline.asOf !== lastReview.asOf || baseline.maxAge !== lastReview.maxAge) {
      comparisonStatus.textContent = 'Assessment settings differ. Match the baseline date and review window to compare individual findings.';
      return;
    }
    const before = reviewedRows(baseline);
    const after = reviewedRows(lastReview);
    let edits = 0;
    // IDs align the same requirement even if visitors reorder or remove rows.
    for (const id of new Set([...before.keys(), ...after.keys()])) {
      const old = before.get(id);
      const current = after.get(id);
      if (JSON.stringify(old) === JSON.stringify(current)) continue;
      const change = document.createElement('article');
      change.className = 'comparison-change';
      const label = !old ? 'Added' : !current ? 'Removed' : 'Changed';
      change.dataset.requirementId = id;
      change.dataset.change = label.toLowerCase();
      addText(change, 'h3', `${id} · ${label}`);
      const sides = document.createElement('div');
      sides.className = 'comparison-sides';
      renderSide(sides, 'Baseline', old);
      renderSide(sides, 'Current review', current, true);
      change.append(sides);
      comparisonRows.append(change);
      edits += 1;
    }
    comparisonStatus.textContent = edits
      ? `Findings changed for ${edits} requirement${edits === 1 ? '' : 's'} since the baseline.`
      : 'No findings changed since the baseline.';
  }

  saveBaseline.addEventListener('click', () => {
    if (!lastReview) return;
    baseline = lastReview;
    renderComparison();
    clearBaseline.focus();
  });
  clearBaseline.addEventListener('click', () => {
    baseline = null;
    renderComparison();
    if (lastReview) saveBaseline.focus();
    else reviewButton.focus();
  });

  function loadFictionalSample() {
    try {
      const replacement = parseWorkspace(window.SecurityWorkspaceSample);
      const reviewed = evaluateWorkspace(replacement.data, replacement.asOf, replacement.maxAge);
      if ((unsaved || hasLoadedWorkspace || baseline) &&
          !window.confirm('Replace the current records and baseline with the fictional sample? Download your workspace first if you want to keep a copy.')) return false;
      replaceWorkspace(replacement, true);
      for (const list of Object.values(lists)) list.closest('details').open = false;
      baseline = reviewed;
      showReview(reviewed);
      sampleStatus.textContent = 'Fictional records reviewed and saved as the baseline. Choose an exercise below.';
    } catch (error) {
      sampleStatus.textContent = `Could not load the fictional sample: ${error.message}`;
    }
    return true;
  }

  sampleButton.addEventListener('click', () => {
    if (loadFictionalSample() && !sampleJumps.hidden) document.getElementById('sample-mfa').focus();
  });
  document.addEventListener('security-workspace:load-sample', () => {
    if (!loadFictionalSample()) return;
    showMode('build');
    fullSample.open = true;
    (sampleJumps.hidden ? sampleButton : document.getElementById('sample-mfa')).focus();
  });

  function revealField(field) {
    for (let panel = field?.closest('details:not([open])'); panel; panel = panel.parentElement.closest('details:not([open])')) {
      panel.open = true;
    }
  }

  function recordField(kind, id, field) {
    const idKey = fields[kind][0].key;
    const index = data[kind].findIndex(record => record[idKey].trim() === id);
    return form.elements.namedItem(`${kind}-${index}-${field}`);
  }

  function focusRecordField(input) {
    revealField(input);
    input.focus({preventScroll:true});
    input.scrollIntoView({block:'center'});
  }

  sampleJumps.addEventListener('click', event => {
    const trigger = event.target.closest('button[data-kind]');
    if (!trigger) return;
    const {kind, id, field} = trigger.dataset;
    const input = recordField(kind, id, field);
    if (!input) {
      sampleStatus.textContent = `${id} is no longer in the current records. Reload the fictional sample to start again.`;
      return;
    }
    clearRecordJump();
    focusRecordField(input);
  });

  function clearRecordJump() {
    recordReturn?.remove();
    recordReturn = null;
  }

  function openRecord(input, trigger, source) {
    clearRecordJump();
    const fromComparison = source === comparison;
    const button = addText(input.closest('.record'), 'button',
      fromComparison ? 'Back to comparison' : 'Back to findings');
    button.type = 'button';
    button.className = 'record-return';
    recordReturn = button;
    button.addEventListener('click', () => {
      if (!lastReview) {
        form.requestSubmit(fromComparison && baseline ? compareReview : reviewButton);
        return;
      }
      clearRecordJump();
      if (trigger.isConnected && !trigger.closest('[hidden], details:not([open])')) trigger.focus();
      else source.focus();
    });
    focusRecordField(input);
  }

  function addRecordLinks(parent, row, source) {
    const details = document.createElement('details');
    details.className = 'finding-records';
    addText(details, 'summary', 'Go to records');
    const actions = document.createElement('div');
    actions.className = 'finding-record-actions';
    details.append(actions);
    parent.append(details);
    // A finding can map to many records. Build the buttons only when opened.
    details.addEventListener('toggle', () => {
      if (!details.open || actions.hasChildNodes()) return;
      function link(kind, id, field) {
        if (!recordField(kind, id, field)) return;
        const button = addText(actions, 'button', `Edit ${labels[kind].toLowerCase()} ${id}`);
        button.type = 'button';
        button.addEventListener('click', () => {
          const input = recordField(kind, id, field);
          if (input) openRecord(input, button, source);
        });
      }
      link('requirements', row.requirement_id, row.claims.length ? 'requirement' : 'control_ids');
      for (const claim of row.claims) {
        link('controls', claim.control_id, claim.evidence_ids.length ? 'statement' : 'evidence_ids');
      }
      for (const id of new Set(row.claims.flatMap(claim => claim.evidence_ids))) {
        link('evidence', id, 'reference');
      }
    });
  }

  function renderReview(review) {
    results.replaceChildren();
    const summary = review.summary;
    addText(results, 'p', `${summary.requirements} requirements: ${summary.supported_drafts} supported drafts; ${summary.needs_work} need work.`);
    results.append(reviewDownloads);
    const label = document.createElement('label');
    label.className = 'result-filter';
    const filter = document.createElement('input');
    filter.type = 'checkbox';
    filter.checked = needsWorkOnly;
    label.append(filter, 'Show only findings that need work');
    results.append(label);
    const filterStatus = addText(results, 'div', '');
    filterStatus.className = 'muted filter-status';
    filterStatus.setAttribute('aria-live', 'polite');
    let findings = results;
    if (review.rows.length > 4) {
      findings = document.createElement('details');
      findings.className = 'review-details';
      addText(findings, 'summary', `See all ${review.rows.length} findings`);
      results.append(findings);
    }
    const cards = review.rows.map(row => {
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
      addRecordLinks(card, row, results);
      findings.append(card);
      return card;
    });
    function applyFilter() {
      needsWorkOnly = filter.checked;
      cards.forEach((card, index) => {
        card.hidden = needsWorkOnly && !review.rows[index].gaps.length;
      });
      filterStatus.textContent = needsWorkOnly
        ? (summary.needs_work ? `Showing ${summary.needs_work} of ${summary.requirements} findings.` : 'No findings need work.')
        : '';
      if (findings !== results) {
        findings.hidden = needsWorkOnly && !summary.needs_work;
        if (needsWorkOnly) findings.open = true;
        findings.querySelector('summary').textContent = needsWorkOnly
          ? `Findings that need work (${summary.needs_work})`
          : `See all ${summary.requirements} findings`;
      }
    }
    filter.addEventListener('change', applyFilter);
    applyFilter();
    results.hidden = false;
  }

  function showReview(snapshot) {
    clearRecordJump();
    lastReview = snapshot;
    renderReview(snapshot.review);
    renderComparison();
    reportButton.hidden = false;
    openFindingsButton.hidden = snapshot.review.summary.gap_items === 0;
    status.textContent = 'Review complete. Results require human review.';
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    status.textContent = '';
    invalidateReview();
    status.textContent = '';
    const invalid = [...form.elements].find(field => field.willValidate && !field.validity.valid);
    revealField(invalid);
    if (!form.reportValidity()) {
      if (event.submitter === compareReview) comparisonStatus.textContent = 'Baseline kept. Fix the highlighted field, then review again.';
      return;
    }
    try {
      showReview(evaluateWorkspace(data, asOf.value, Number(maxAge.value)));
      (event.submitter === compareReview ? comparison : results).focus();
    } catch (error) {
      results.hidden = true;
      reportButton.hidden = true;
      openFindingsButton.hidden = true;
      lastReview = null;
      errorBox.textContent = `Unable to review: ${error.message}`;
      errorBox.hidden = false;
      if (event.submitter === compareReview) {
        comparisonStatus.textContent = `Baseline kept. ${errorBox.textContent}`;
        comparison.focus();
      } else {
        errorBox.focus();
      }
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

  function csvCell(value) {
    // Spreadsheet apps can interpret a text value as a formula on import.
    const plainText = /^[\t\r\n]/.test(value) || /^[=+@-]/.test(value.trimStart())
      ? "'" + value
      : value;
    return '"' + plainText.replaceAll('"', '""') + '"';
  }

  openFindingsButton.addEventListener('click', () => {
    if (!lastReview?.review.summary.gap_items) return;
    const priorities = ['critical', 'high', 'medium', 'low'];
    const findings = lastReview.review.rows.filter(row => row.gaps.length).sort((a, b) =>
      priorities.indexOf(a.priority) - priorities.indexOf(b.priority) ||
      a.requirement_id.localeCompare(b.requirement_id, 'en'));
    const rows = [
      ['requirement_id', 'priority', 'domain', 'gap'],
      ...findings.flatMap(row => row.gaps.map(gap => [row.requirement_id, row.priority, row.domain, gap])),
    ];
    const csv = rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
    download(`security-open-findings-${lastReview.asOf}.csv`, '\uFEFF' + csv, 'text/csv;charset=utf-8');
  });

  asOf.value = today();
  data.requirements.push(blankRecord('requirements'));
  renderRecords();
  renderComparison();
  showMode(new URLSearchParams(location.search).get('view') === 'build' ? 'build' : 'sample');
  document.getElementById('initial-status').hidden = true;
  root.hidden = false;
})();
