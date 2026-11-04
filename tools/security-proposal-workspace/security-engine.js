/* Security Proposal Workspace: browser-side review of recorded metadata.
 *
 * The model and rule order follow proposal.py. This module does not read an
 * evidence file, connect to a service, or establish security compliance. A
 * supported draft always needs a human review of actual supporting evidence.
 */
(function (root, factory) {
  'use strict';
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  if (root) root.SecurityEngine = engine;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // These fields correspond to the columns accepted by the Python version.
  const SCHEMAS = Object.freeze({
    requirements: Object.freeze(['requirement_id', 'domain', 'requirement', 'priority', 'control_ids', 'coverage_review', 'reviewer', 'reviewed_on', 'framework', 'framework_version', 'source_ref', 'source_url']),
    controls: Object.freeze(['control_id', 'title', 'status', 'owner', 'statement', 'target_date', 'evidence_ids']),
    evidence: Object.freeze(['evidence_id', 'title', 'reference', 'review_status', 'reviewed_on'])
  });
  const REQUIRED = {
    requirements: ['domain', 'requirement', 'priority', 'coverage_review', 'framework', 'framework_version', 'source_ref', 'source_url'],
    controls: ['title', 'status'],
    evidence: ['title', 'review_status']
  };
  const CONTROL_STATUSES = new Set(['implemented', 'partial', 'planned', 'not_implemented', 'unknown']);
  const PRIORITIES = new Set(['low', 'medium', 'high', 'critical']);
  const COVERAGE_STATUSES = new Set(['pending', 'approved', 'rejected']);
  const EVIDENCE_STATUSES = new Set(['reviewed', 'pending', 'rejected']);
  const DAY_MS = 86400000;

  // Parsing dates explicitly avoids local-time differences and JS's automatic
  // rollover, for example treating an invalid February date as a March date.
  function parseDate(value, field) {
    if (value === '') return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error(`${field}: use YYYY-MM-DD`);
    }
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(5, 7));
    const day = Number(value.slice(8, 10));
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
      throw new Error(`${field}: invalid calendar date`);
    }
    // setUTCFullYear handles years 0001 to 0099 without JS's 1900 offset.
    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      throw new Error(`${field}: invalid calendar date`);
    }
    return date.getTime();
  }

  // Multiple IDs mean every mapped record must pass, not just one of them.
  function references(value) {
    const ids = value.split(';').map(part => part.trim()).filter(Boolean);
    if (new Set(ids).size !== ids.length) throw new Error('Repeated IDs within a mapping');
    return ids;
  }

  function validate(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Assessment data must be an object');
    const indexes = {};
    for (const [kind, fields] of Object.entries(SCHEMAS)) {
      if (!Array.isArray(data[kind])) throw new Error(`${kind}: expected a list of records`);
      indexes[kind] = new Map();
      const idKey = fields[0];
      for (const row of data[kind]) {
        if (!row || typeof row !== 'object' || Array.isArray(row) ||
            Object.keys(row).length !== fields.length ||
            fields.some(field => !Object.hasOwn(row, field) || typeof row[field] !== 'string')) {
          throw new Error(`${kind}: invalid record shape`);
        }
        const id = row[idKey];
        if (!/^[A-Z][A-Z0-9-]{1,39}$/.test(id)) throw new Error(`${kind}: IDs must be uppercase letters, digits or hyphens`);
        if (indexes[kind].has(id)) throw new Error(`${kind}: duplicate ID ${id}`);
        if (REQUIRED[kind].some(field => !row[field].trim())) throw new Error(`${id}: missing required field`);
        indexes[kind].set(id, row);
      }
    }
    if (!data.requirements.length) throw new Error('At least one requirement is needed');
    for (const row of data.requirements) {
      const id = row.requirement_id;
      if (!row.source_url.startsWith('https://')) throw new Error(`${id}: source_url must use HTTPS`);
      if (!PRIORITIES.has(row.priority) || !COVERAGE_STATUSES.has(row.coverage_review)) throw new Error(`${id}: invalid priority or coverage_review`);
      parseDate(row.reviewed_on, id);
      for (const ref of references(row.control_ids)) if (!indexes.controls.has(ref)) throw new Error(`${id}: unknown control ${ref}`);
    }
    for (const row of data.controls) {
      const id = row.control_id;
      if (!CONTROL_STATUSES.has(row.status)) throw new Error(`${id}: invalid status`);
      parseDate(row.target_date, id);
      for (const ref of references(row.evidence_ids)) if (!indexes.evidence.has(ref)) throw new Error(`${id}: unknown evidence ${ref}`);
    }
    for (const row of data.evidence) {
      const id = row.evidence_id;
      if (!EVIDENCE_STATUSES.has(row.review_status)) throw new Error(`${id}: invalid review_status`);
      parseDate(row.reviewed_on, id);
    }
    return indexes;
  }

  function evaluate(data, asOf, maxAgeDays = 180) {
    if (!Number.isInteger(maxAgeDays) || maxAgeDays < 1) throw new Error('Evidence freshness must be at least one day');
    const day = parseDate(asOf, 'Assessment date');
    if (day === null) throw new Error('Assessment date cannot be empty');
    const { controls, evidence } = validate(data);
    const rows = [];
    for (const requirement of data.requirements) {
      const gaps = [];
      const claims = [];
      const ids = references(requirement.control_ids);
      if (!ids.length) gaps.push('No control mapped; document an approach and assign a control owner.');
      if (requirement.coverage_review !== 'approved') gaps.push('Requirement coverage has not been approved by a human reviewer.');
      if (!requirement.reviewer.trim()) gaps.push('Requirement coverage reviewer is missing.');
      const reviewed = parseDate(requirement.reviewed_on, requirement.requirement_id);
      if (reviewed === null) gaps.push('Requirement coverage review date is missing.');
      else if (reviewed > day) gaps.push('Requirement coverage review date is in the future.');
      else if ((day - reviewed) / DAY_MS > maxAgeDays) gaps.push('Requirement coverage review is stale under the selected freshness window.');

      for (const controlId of ids) {
        const control = controls.get(controlId);
        if (control.status !== 'implemented') gaps.push(`${controlId}: status is ${control.status}; do not claim implementation.`);
        if (!control.owner.trim()) gaps.push(`${controlId}: owner is missing.`);
        if (!control.statement.trim()) gaps.push(`${controlId}: response statement is missing.`);
        const target = parseDate(control.target_date, controlId);
        if (control.status !== 'implemented') {
          if (target === null) gaps.push(`${controlId}: target date is missing.`);
          else if (target < day) gaps.push(`${controlId}: target date is overdue.`);
        }
        const evIds = references(control.evidence_ids);
        if (!evIds.length) gaps.push(`${controlId}: evidence reference is missing.`);
        for (const evId of evIds) {
          const ev = evidence.get(evId);
          if (!ev.reference.trim()) gaps.push(`${evId}: evidence location or reference is missing.`);
          if (ev.review_status !== 'reviewed') gaps.push(`${evId}: evidence has not passed recorded human review.`);
          const reviewedOn = parseDate(ev.reviewed_on, evId);
          if (reviewedOn === null) gaps.push(`${evId}: evidence review date is missing.`);
          else if (reviewedOn > day) gaps.push(`${evId}: evidence review date is in the future.`);
          else if ((day - reviewedOn) / DAY_MS > maxAgeDays) gaps.push(`${evId}: evidence review is stale under the selected freshness window.`);
        }
        claims.push({control_id: controlId, status: control.status, owner: control.owner,
                     statement: control.statement, target_date: control.target_date, evidence_ids: evIds});
      }
      rows.push({...requirement, state: gaps.length ? 'needs_work' : 'supported_draft', gaps: [...new Set(gaps)], claims});
    }
    const supported = rows.filter(row => row.state === 'supported_draft').length;
    return {rows, summary: {requirements: rows.length, supported_drafts: supported,
      needs_work: rows.length - supported, gap_items: rows.reduce((total, row) => total + row.gaps.length, 0),
      as_of: asOf, max_age_days: maxAgeDays}};
  }

  return Object.freeze({SCHEMAS, evaluate});
});
