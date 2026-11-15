(function () {
  'use strict';

  const panel = document.getElementById('guided-sample');
  if (!panel) return;

  const scenarios = {
    account: {
      requirementId: 'REQ-007',
      controlId: 'CTL-007',
      evidenceId: 'EV-007',
      question: 'Can we show that staff use an extra check when signing in?',
      requirement: 'Staff who use the agency’s advertising accounts must verify their identity a second way when they sign in.',
      safeguard: 'The agency records that an extra sign in check is required for the advertising accounts in this sample.',
      evidence: [
        'A reviewer signed off on the record. The agency hasn’t linked it to the safeguard yet.',
        'The reviewed record is now linked to the safeguard.'
      ],
      finding: 'The safeguard is recorded as in place, but the assessment needs a link to the reviewed record before it can support the draft.',
      action: 'Link the reviewed record',
      controlChanges: {evidence_ids: 'EV-007'}
    },
    backup: {
      requirementId: 'REQ-010',
      controlId: 'CTL-010',
      evidenceId: 'EV-010',
      question: 'Can we show that the team tested a backup restore?',
      requirement: 'Protect the agency’s campaign files and test that they can be restored.',
      safeguard: 'The agency has marked its backup and restore safeguard as only partly in place.',
      updatedSafeguard: 'The agency records that its campaign files are backed up and its restore test is complete.',
      evidence: [
        'A backup exercise is on file. The team still needs to finish and document the restore test.',
        'The sample now includes a reviewed record of restoring campaign files to a separate location.'
      ],
      finding: 'The assessment flags the incomplete safeguard. In the simulation, you can record a finished restore test and its review, then see what changes.',
      action: 'Record the completed restore and review',
      controlChanges: {
        status: 'implemented',
        target_date: '',
        statement: 'Fictional scenario: protected backups cover the in-scope campaign files, and a documented restore to a separate destination was reviewed.'
      },
      evidenceChanges: {reference: 'DEMO-RESTORE-REVIEW-010', reviewed_on: '2026-10-27', review_status: 'reviewed'},
      unchangedId: 'REQ-015'
    }
  };

  const statusLabels = {needs_work: 'Needs work', supported_draft: 'Supports the draft'};
  const content = panel.querySelector('[data-guided-content]');
  const fallback = panel.querySelector('[data-guided-fallback]');
  const choices = Array.from(panel.querySelectorAll('[data-guided-choice]'));
  const fields = Object.fromEntries(Array.from(panel.querySelectorAll('[data-guided-field]'),
    node => [node.dataset.guidedField, node]));
  const completed = new Set();
  let selected = 'account';

  function findRow(report, requirementId) {
    const row = report.rows.find(item => item.requirement_id === requirementId);
    if (!row) throw new Error(`Missing guided sample requirement ${requirementId}`);
    return row;
  }

  function formatSummary(summary) {
    const noun = summary.requirements === 1 ? 'requirement' : 'requirements';
    return `${summary.supported_drafts} of ${summary.requirements} ${noun} support a draft response`;
  }

  function assessScenario(sample, evaluate, scenario, startingReport) {
    const data = {
      requirements: sample.data.requirements.map(row => ({...row})),
      controls: sample.data.controls.map(row => ({...row,
        ...(row.control_id === scenario.controlId ? scenario.controlChanges : {})})),
      evidence: sample.data.evidence.map(row => ({...row,
        ...(row.evidence_id === scenario.evidenceId ? scenario.evidenceChanges : {})}))
    };
    const reviewedReport = evaluate(data, sample.as_of, sample.max_age_days);
    const startingRow = findRow(startingReport, scenario.requirementId);
    const reviewedRow = findRow(reviewedReport, scenario.requirementId);
    const record = data.evidence.find(row => row.evidence_id === scenario.evidenceId);
    if (!record) throw new Error(`Missing guided sample evidence ${scenario.evidenceId}`);

    let separateFinding = '';
    if (scenario.unchangedId) {
      const startingOther = findRow(startingReport, scenario.unchangedId);
      const reviewedOther = findRow(reviewedReport, scenario.unchangedId);
      const sameFinding = startingOther.state === reviewedOther.state &&
        JSON.stringify(startingOther.gaps) === JSON.stringify(reviewedOther.gaps);
      if (sameFinding) {
        separateFinding = `${reviewedOther.requirement_id} is unchanged and still marked “${statusLabels[reviewedOther.state]}”.`;
        if (reviewedOther.gaps.some(gap => gap.includes('evidence review date is in the future'))) {
          separateFinding += ' Its evidence review date falls after the assessment date.';
        }
      } else {
        separateFinding = `${reviewedOther.requirement_id} is marked “${statusLabels[reviewedOther.state]}” after this change.`;
      }
    }
    return {startingReport, reviewedReport, startingRow, reviewedRow, record, separateFinding};
  }

  function render(results) {
    const scenario = scenarios[selected];
    const result = results[selected];
    const isComplete = completed.has(selected);
    const row = isComplete ? result.reviewedRow : result.startingRow;
    const report = isComplete ? result.reviewedReport : result.startingReport;
    const claim = row.claims.find(item => item.control_id === scenario.controlId);
    const hasLinkedEvidence = claim.evidence_ids.includes(scenario.evidenceId);
    const meetsChecks = row.state === 'supported_draft';

    for (const choice of choices) {
      choice.setAttribute('aria-pressed', String(choice.dataset.guidedChoice === selected));
    }
    fields.question.textContent = scenario.question;
    fields.requirement.textContent = scenario.requirement;
    fields.safeguard.textContent = isComplete && scenario.updatedSafeguard ? scenario.updatedSafeguard : scenario.safeguard;
    fields.evidence.textContent = scenario.evidence[Number(isComplete)];
    fields.state.textContent = statusLabels[row.state];
    fields.finding.textContent = meetsChecks
      ? 'The recorded safeguard and reviewed evidence support a draft response for this requirement.'
      : isComplete ? 'The assessment still flags a gap. See the review details below.' : scenario.finding;
    fields.summary.textContent = `${formatSummary(report.summary)} in this fictional assessment.`;
    fields.summary.hidden = isComplete;
    fields.comparison.textContent = isComplete
      ? `Supported drafts in the sample: ${result.startingReport.summary.supported_drafts} of ${result.startingReport.summary.requirements} before, ${report.summary.supported_drafts} of ${report.summary.requirements} after.`
      : '';
    fields.comparison.hidden = !isComplete;
    fields.separateFinding.textContent = result.separateFinding;
    fields.separateFinding.hidden = !isComplete || !result.separateFinding;
    fields.action.textContent = isComplete ? 'Show the starting point' : scenario.action;
    fields.framework.textContent = `${row.framework} ${row.framework_version} · ${row.source_ref}`;
    fields.records.textContent = `${row.requirement_id} · ${claim.control_id} · ${result.record.evidence_id} (${hasLinkedEvidence ? 'linked' : 'unlinked'})`;
    fields.settings.textContent = `${report.summary.as_of} · Review window of ${report.summary.max_age_days} days`;
    fields.gaps.replaceChildren(...row.gaps.map(gap => {
      const item = document.createElement('li');
      item.textContent = gap;
      return item;
    }));
    fields.gaps.hidden = !row.gaps.length;
    fields.noGaps.hidden = !!row.gaps.length;
  }

  try {
    const sample = window.SecurityWorkspaceSample;
    const evaluate = window.SecurityEngine.evaluate;
    const startingReport = evaluate(sample.data, sample.as_of, sample.max_age_days);
    const results = Object.fromEntries(Object.entries(scenarios).map(([id, scenario]) =>
      [id, assessScenario(sample, evaluate, scenario, startingReport)]));

    render(results);
    for (const choice of choices) {
      choice.addEventListener('click', () => {
        selected = choice.dataset.guidedChoice;
        render(results);
      });
    }
    fields.action.addEventListener('click', () => {
      if (!completed.delete(selected)) completed.add(selected);
      render(results);
    });
    fields.editor.addEventListener('click', () => document.dispatchEvent(new Event('security-workspace:load-sample')));
    content.hidden = false;
    fallback.hidden = true;
  } catch (error) {
    fallback.textContent = 'The guided sample couldn’t load. Refresh to try again, or open the assessment editor.';
  }
})();
