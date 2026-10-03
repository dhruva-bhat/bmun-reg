const test = require('node:test');
const assert = require('node:assert');
const Schools = require('../src/Schools');

const schools = [
  { school_id: 'S0001', name: 'Acalanes', aliases: 'ACALANES HS, Acalanes High School' },
  { school_id: 'S0002', name: 'Lowell', aliases: '' },
];

test('resolve matches canonical names and aliases regardless of case', () => {
  assert.deepStrictEqual(Schools.resolve(schools, 'ACALANES HIGH SCHOOL'), { school_id: 'S0001' });
  assert.deepStrictEqual(Schools.resolve(schools, ' lowell '), { school_id: 'S0002' });
});

test('resolve flags unknown names instead of creating schools', () => {
  assert.deepStrictEqual(Schools.resolve(schools, 'Miramonte'), { unmapped: true, raw: 'Miramonte' });
});

test('addAlias maps a flagged name and is idempotent', () => {
  const s = Schools.addAlias(schools[1], 'Lowell HS');
  assert.strictEqual(s.aliases, 'Lowell HS');
  assert.strictEqual(Schools.addAlias(s, 'lowell hs').aliases, 'Lowell HS');
});

test('search finds by partial name or alias', () => {
  assert.deepStrictEqual(Schools.search(schools, 'acal').map(s => s.school_id), ['S0001']);
  assert.deepStrictEqual(Schools.search(schools, ''), []);
});
