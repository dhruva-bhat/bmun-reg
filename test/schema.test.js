const test = require('node:test');
const assert = require('node:assert');
const Schema = require('../src/Schema');

test('toObjects and toValues round-trip and tolerate reordered or missing columns', () => {
  const headers = ['a', 'b', 'c'];
  const objs = Schema.toObjects([['c', 'a'], ['3', '1'], ['', ''], ['4', '2']], headers);
  assert.deepStrictEqual(objs, [{ a: '1', b: '', c: '3' }, { a: '2', b: '', c: '4' }]);
  assert.deepStrictEqual(Schema.toValues(objs, headers), [['a', 'b', 'c'], ['1', '', '3'], ['2', '', '4']]);
});

test('emptyState has every table', () => {
  assert.deepStrictEqual(Object.keys(Schema.emptyState()).sort(),
    ['advisors', 'changeLog', 'delegates', 'payments', 'rooms', 'schools', 'seed', 'waivers']);
});
