// Run with: node --test tests/explorer.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readSample, analyze } = require('../scripts/explorer.js');
test('fictional demo calculates results from six records', () => {
  const r = analyze(readSample());
  assert.equal(r.valid.length, 5);
  assert.deepEqual(r.excluded.map(x => x.ticket_id), ['SAMPLE-006']);
  assert.deepEqual(r.missing.map(x => x.ticket_id), ['SAMPLE-003']);
  assert.deepEqual(r.repeated, [['file share inaccessible', 2]]);
});
test('invalid first row does not prevent a later valid row with the same ID', () => {
  const row = readSample()[0];
  const r = analyze([{...row, priority: ''}, row]);
  assert.equal(r.valid.length, 1);
  assert.equal(r.excluded.length, 1);
});
test('duplicate IDs are rejected regardless of case', () => {
  const row = readSample()[0];
  const r = analyze([row, {...row, ticket_id: row.ticket_id.toLowerCase()}]);
  assert.equal(r.valid.length, 1);
  assert.equal(r.excluded.length, 1);
});
test('only resolved and closed tickets require resolution notes', () => {
  const row = readSample()[0];
  const r = analyze(['new','in progress','resolved','closed'].map((status,i) => ({...row, status, ticket_id: String(i), resolution:'  '})));
  assert.deepEqual(r.missing.map(x => x.ticket_id), ['2','3']);
});
test('invalid categories and statuses do not enter analysis', () => {
  const row = readSample()[0];
  const r = analyze([{...row, category:' '}, {...row,status:'unknown'}, {...row, priority:'urgent'}]);
  assert.equal(r.valid.length, 0);
  assert.equal(r.excluded.length, 3);
});
test('punctuation and whitespace normalize for repeated wording', () => {
  const row = readSample()[0];
  const r = analyze([row, {...row, ticket_id:'another', subject:' FILE share... inaccessible! '}]);
  assert.equal(r.repeated.length, 1);
  assert.equal(r.repeated[0][1], 2);
});
