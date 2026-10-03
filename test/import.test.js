const test = require('node:test');
const assert = require('node:assert');
const Csv = require('../src/Csv');
const Import = require('../src/Import');

const csv = `School,Advisor Name,Advisor Email,Advisor Phone,Delegate Name,Workshop
Acalanes,Pat Lee,pat@x.org,555,Ann One,Novice
ACALANES HS,Pat Lee,pat@x.org,555,Bob Two,Advanced
Acalanes,Pat Lee,pat@x.org,555,Ann One,Novice
Lowell,Kim Wu,,,Cy Three,Chair
Lowell,Kim Wu,,,Dee Four,Wizard
,,,,Ghost,Novice
`;

function empty() { return { schools: [], advisors: [], delegates: [], waivers: [], rooms: [], changeLog: [] }; }

test('first load creates schools, advisors and delegates once', () => {
  const s = empty();
  s.schools.push({ school_id: 'S0001', name: 'Acalanes', aliases: 'ACALANES HS', cap_novice: '', cap_advanced: '', cap_crisis: '', cap_chair: '' });
  const r = Import.registration(s, Csv.parseObjects(csv), null, { createSchools: true });
  assert.strictEqual(r.schools, 1);
  assert.strictEqual(r.advisors, 2);
  assert.strictEqual(r.delegates, 3);
  assert.strictEqual(s.schools.length, 2);
  assert.deepStrictEqual(r.skipped.map(x => x.reason), ['unknown workshop "Wizard"', 'no school']);
  assert.strictEqual(s.schools[0].cap_novice, 1);
  assert.strictEqual(s.schools[0].cap_advanced, 1);
});

test('re-import is idempotent', () => {
  const s = empty();
  Import.registration(s, Csv.parseObjects(csv), null, { createSchools: true });
  const before = JSON.stringify(s);
  const r = Import.registration(s, Csv.parseObjects(csv), null, { createSchools: true });
  assert.strictEqual(r.delegates + r.advisors + r.schools, 0);
  assert.strictEqual(JSON.stringify(s), before);
});

test('unknown school names are flagged, not created, once schools are loaded', () => {
  const s = empty();
  s.schools.push({ school_id: 'S0001', name: 'Acalanes', aliases: 'ACALANES HS', cap_novice: '', cap_advanced: '', cap_crisis: '', cap_chair: '' });
  Import.registration(s, Csv.parseObjects(csv), null, { createSchools: true });
  const r = Import.registration(s, Csv.parseObjects('School,Delegate Name,Workshop\nMiramonte,Eve Five,Novice\n'));
  assert.deepStrictEqual(r.unmapped, ['Miramonte']);
  assert.strictEqual(s.schools.length, 2);
  assert.strictEqual(s.delegates.length, 3);
});

test('a renamed form column is a one-line config fix', () => {
  const s = empty();
  const r = Import.registration(s, Csv.parseObjects('Team,Student,Track\nLowell,Cy,Novice\n'),
    { school: 'Team', delegate_name: 'Student', workshop: 'Track' }, { createSchools: true });
  assert.strictEqual(r.delegates, 1);
});
