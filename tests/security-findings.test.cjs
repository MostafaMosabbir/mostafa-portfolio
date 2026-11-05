const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { validate } = require('../scripts/security-findings.js');
const dir = path.join(__dirname, '../cybersecurity/security-proposal-workspace');
const data = JSON.parse(fs.readFileSync(path.join(dir, 'analysis/findings.json'), 'utf8'));
const md5 = filename => crypto.createHash('md5').update(fs.readFileSync(filename)).digest('hex');

test('R output matches both fictional source reports and the browser data file', () => {
  assert.ok(validate(data));
  assert.equal(data.source_md5, md5(path.join(dir, 'reports/crosswalk.csv')));
  assert.equal(data.gaps_md5, md5(path.join(dir, 'reports/gaps.csv')));
  assert.deepEqual(data.totals, { supported_draft: 4, needs_work: 11, requirements: 15 });
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(dir, 'analysis/findings-data.js'), 'utf8'), context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.window.SECURITY_FINDINGS_DATA)), data);
  assert.deepEqual(data.domains.find(row => row.domain === 'Identify').example.gaps.length, 2);
});
test('invalid or inconsistent output is rejected rather than charted', () => {
  assert.equal(validate(null), false);
  assert.equal(validate({ ...data, totals: { ...data.totals, needs_work: 99 } }), false);
  assert.equal(validate({ ...data, domains: data.domains.slice(1) }), false);
});

class Node {
  constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; this.dataset = {}; this.style = {}; this.listeners = {}; this.textContent = ''; }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  addEventListener(type, fn) { this.listeners[type] = fn; }
}
function all(node) { return [node, ...node.children.flatMap(child => all(child))]; }
test('selecting a function updates counts, examples and pressed state', () => {
  const root = new Node('div');
  const doc = { getElementById: () => root, createElement: tag => new Node(tag), createTextNode: text => { const n = new Node('#text'); n.textContent = text; return n; } };
  const script = fs.readFileSync(path.join(__dirname, '../scripts/security-findings.js'), 'utf8');
  vm.runInNewContext(script, { document: doc, window: { SECURITY_FINDINGS_DATA: data }, Number, Math });
  const elements = all(root);
  const buttons = elements.filter(node => node.className === 'sf-row');
  assert.equal(buttons.length, 6);
  assert.equal(buttons.find(button => button.dataset.domain === 'Protect').attributes['aria-pressed'], 'true');
  buttons.find(button => button.dataset.domain === 'Identify').listeners.click();
  assert.equal(buttons.find(button => button.dataset.domain === 'Identify').attributes['aria-pressed'], 'true');
  assert.equal(buttons.filter(button => button.attributes['aria-pressed'] === 'true').length, 1);
  const detail = elements.find(node => node.className === 'sf-detail');
  const text = all(detail).map(node => node.textContent).join(' ');
  assert.match(text, /REQ-006/);
  assert.match(text, /target date is overdue/);
});
test('the accessible fallback remains when data is unavailable', () => {
  const root = new Node('div'); root.textContent = 'Fallback summary';
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../scripts/security-findings.js'), 'utf8'), {
    document: { getElementById: () => root }, window: {}, Number, Math
  });
  assert.equal(root.textContent, 'Fallback summary');
  assert.equal(root.children.length, 0);
});
