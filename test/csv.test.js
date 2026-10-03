const test = require('node:test');
const assert = require('node:assert');
const Csv = require('../src/Csv');

test('parses quotes, embedded commas, newlines and CRLF', () => {
  const rows = Csv.parse('a,b\r\n"x, y","he said ""hi""\nthere"\r\n');
  assert.deepStrictEqual(rows, [['a', 'b'], ['x, y', 'he said "hi"\nthere']]);
});

test('parseObjects keys rows by header', () => {
  assert.deepStrictEqual(Csv.parseObjects('﻿name,school\nAnn,Lowell\n'), [{ name: 'Ann', school: 'Lowell' }]);
});

test('stringify quotes fields and defuses formulas', () => {
  assert.strictEqual(Csv.stringify([['a,b', '=SUM(A1)', 'ok']]), '"a,b",\'=SUM(A1),ok\r\n');
});
