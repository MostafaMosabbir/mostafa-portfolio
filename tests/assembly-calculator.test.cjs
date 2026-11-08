const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseOperand, buildTrace } = require('../scripts/assembly-calculator.js');

test('operands accept signed decimal whole numbers within the displayed limits', () => {
  for (const [input, expected] of [
    ['  +18  ', 18], ['-4', -4], ['-9999', -9999], ['9999', 9999], ['-0', 0]
  ]) {
    assert.equal(parseOperand(input), expected, input);
  }

  for (const input of ['', ' ', '+', '1.5', '1e2', '0x10', '10000', '-10000']) {
    assert.equal(parseOperand(input), null, input);
  }
});

test('addition, subtraction, and multiplication write EAX then save that result', () => {
  for (const [operation, mnemonic, slot, left, right, result] of [
    ['add', 'add', 'sum', 18, 4, 22],
    ['subtract', 'sub', 'sub', 4, 18, -14],
    ['multiply', 'imul', 'mul', 9999, -9999, -99980001]
  ]) {
    const trace = buildTrace(operation, left, right);
    assert.equal(trace.result, result);
    assert.deepEqual(trace.frames.map(frame => frame.instruction.toLowerCase()), [
      'mov eax, esi', `${mnemonic} eax, edi`, `mov [val_${slot}], eax`
    ]);
    assert.deepEqual(trace.frames.map(({ eax, edx }) => [eax, edx]), [
      [left, null], [result, null], [result, null]
    ]);
  }
});

test('CDQ sign extends the dividend and IDIV uses its sign for the remainder', () => {
  for (const [left, right, sign, quotient, remainder] of [
    [18, 4, 0, 4, 2], [-18, 4, -1, -4, -2],
    [18, -4, 0, -4, 2], [-18, -4, -1, 4, -2],
    [-2, 4, -1, 0, -2], [-18, 3, -1, -6, 0], [0, -4, 0, 0, 0]
  ]) {
    const trace = buildTrace('divide', left, right);
    assert.equal(trace.result, quotient);
    assert.deepEqual(trace.frames.map(frame => frame.instruction.toLowerCase()), [
      'mov eax, esi', 'cdq', 'idiv edi', 'mov [val_div], eax'
    ]);
    assert.deepEqual(trace.frames.map(({ eax, edx }) => [eax, edx]), [
      [left, null], [left, sign], [quotient, remainder], [quotient, remainder]
    ]);
    assert.equal(left, quotient * right + remainder);
  }
});

test('division by zero stops at IDIV with pre-fault register values', () => {
  const { result, frames } = buildTrace('divide', -18, 0);

  assert.equal(result, null);
  assert.equal(frames.length, 3);
  assert.equal(frames[2].instruction.toLowerCase(), 'idiv edi');
  assert.match(frames[2].explanation, /zero/i);
  assert.deepEqual([frames[2].eax, frames[2].edx], [-18, -1]);
});
