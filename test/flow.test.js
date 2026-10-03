const test = require('node:test');
const assert = require('node:assert');
const Schema = require('../src/Schema');
const Csv = require('../src/Csv');
const Import = require('../src/Import');
const Waivers = require('../src/Waivers');
const Assign = require('../src/Assign');
const Changes = require('../src/Changes');
const Views = require('../src/Views');
const CheckIn = require('../src/CheckIn');

test('registration to check-in end to end', () => {
  const s = Schema.emptyState();
  const people = [];
  for (let i = 1; i <= 9; i++) people.push(`${i % 2 ? 'Acalanes' : 'ACALANES HS'},Pat Lee,Kid ${i},Novice`);
  const csv = 'School,Advisor Name,Delegate Name,Workshop\n' + people.join('\n') + '\n';
  s.schools.push({ school_id: 'S0001', name: 'Acalanes', aliases: 'ACALANES HS', cap_novice: '', cap_advanced: '', cap_crisis: '', cap_chair: '', checked_in: false });
  s.rooms = [1, 2].map(i => ({ room_id: 'R' + i, workshop: 'Novice', display_name: 'Novice ' + i, capacity: 10 }));

  Import.registration(s, Csv.parseObjects(csv));
  assert.strictEqual(s.schools.length, 1);
  assert.strictEqual(s.delegates.length, 9);
  assert.strictEqual(s.schools[0].cap_novice, 9);

  Waivers.ingest(s, [1, 2, 3, 4, 5, 6, 7, 8].map(i => ({ Timestamp: 't' + i, 'Participant Name': 'kid  ' + i })));
  Waivers.ingest(s, [{ Timestamp: 'tx', 'Participant Name': 'Pat Lee' }]);
  assert.strictEqual(Waivers.run(s).linked, 9);

  Assign.run(s, { seed: 1 });
  assert.ok(s.delegates.every(d => d.room_id));

  const ctx = { user: 'staff@x.org', now: 'now' };
  Changes.apply(s, ctx, 'drop', { delegate_id: 'D0009' });
  Changes.apply(s, ctx, 'late_add', { school_id: 'S0001', name: 'Walk Up', workshop: 'Novice' });
  const v = CheckIn.schoolView(s, 'S0001');
  assert.strictEqual(v.summary.registered, 9);
  assert.strictEqual(v.summary.missing, 1);
  assert.throws(() => Changes.apply(s, ctx, 'check_in_school', { school_id: 'S0001' }), /note is required/);
  Changes.apply(s, ctx, 'paper_waiver', { delegate_id: 'D0010' });
  Changes.apply(s, ctx, 'check_in_school', { school_id: 'S0001' });
  assert.strictEqual(Views.schoolSummary(s)[1][12], 'yes');
  assert.ok(s.changeLog.length >= 6);
});
