const test = require('node:test');
const assert = require('node:assert');
const Normalize = require('../src/Normalize');
const Ids = require('../src/Ids');

test('name normalizes case, spacing, accents and punctuation', () => {
  assert.strictEqual(Normalize.name('  José   O\'Brien-Lee '), 'jose o brien lee');
  assert.strictEqual(Normalize.name(null), '');
});

test('distance counts edits', () => {
  assert.strictEqual(Normalize.distance('kettenring', 'kettering'), 1);
  assert.strictEqual(Normalize.distance('abc', 'abc'), 0);
  assert.strictEqual(Normalize.distance('', 'abc'), 3);
});

test('Ids.next increments per kind and ignores foreign IDs', () => {
  assert.strictEqual(Ids.next('delegate', []), 'D0001');
  assert.strictEqual(Ids.next('delegate', ['D0001', 'D0009', 'S0020']), 'D0010');
  assert.throws(() => Ids.next('nope', []));
});
