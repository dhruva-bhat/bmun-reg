const test = require('node:test');
const assert = require('node:assert');
const Changes = require('../src/Changes');
const Assign = require('../src/Assign');

const ctx = { user: 'staff@bmun.org', now: '2026-10-03T09:00:00Z' };

function state() {
  const s = {
    seed: 11,
    schools: [{ school_id: 'S1', name: 'Acalanes', checked_in: false, cap_novice: 4 }],
    advisors: [{ advisor_id: 'A1', school_id: 'S1', name: 'Pat Lee', waiver_matched: 'TRUE' }],
    delegates: [1, 2, 3].map(i => ({ delegate_id: 'D000' + i, school_id: 'S1', name: 'Del ' + i, workshop: 'Novice', status: 'registered', waiver_id: 'W' + i, room_id: '', locked: false })),
    waivers: [],
    rooms: [{ room_id: 'R1', workshop: 'Novice', capacity: 10 }, { room_id: 'R2', workshop: 'Novice', capacity: 10 }, { room_id: 'R3', workshop: 'Advanced', capacity: 10 }],
    changeLog: [],
  };
  Assign.run(s, { seed: s.seed });
  return s;
}

test('drop keeps the row, frees the seat and logs both fields', () => {
  const s = state();
  Changes.apply(s, ctx, 'drop', { delegate_id: 'D0001' });
  const d = s.delegates[0];
  assert.strictEqual(s.delegates.length, 3);
  assert.strictEqual(d.status, 'dropped');
  assert.strictEqual(d.room_id, '');
  assert.ok(s.changeLog.some(l => l.field === 'status' && l.old_value === 'registered' && l.new_value === 'dropped' && l.user === ctx.user));
});

test('late add creates a flagged row and places it at once', () => {
  const s = state();
  const { result } = Changes.apply(s, ctx, 'late_add', { school_id: 'S1', name: 'New Kid', workshop: 'Novice' });
  assert.strictEqual(result.status, 'late add');
  assert.strictEqual(result.delegate_id, 'D0004');
  assert.ok(result.room_id);
});

test('workshop change re-places only that delegate', () => {
  const s = state();
  const others = s.delegates.slice(1).map(d => d.room_id);
  Changes.apply(s, ctx, 'change_workshop', { delegate_id: 'D0001', workshop: 'Advanced' });
  assert.strictEqual(s.delegates[0].room_id, 'R3');
  assert.deepStrictEqual(s.delegates.slice(1).map(d => d.room_id), others);
});

test('paper waiver links a new manual waiver and rejects duplicates', () => {
  const s = state();
  s.delegates[0].waiver_id = '';
  Changes.apply(s, ctx, 'paper_waiver', { delegate_id: 'D0001' });
  assert.strictEqual(s.delegates[0].waiver_id, 'W0001');
  assert.strictEqual(s.waivers[0].match_status, 'manual');
  assert.throws(() => Changes.apply(s, ctx, 'paper_waiver', { delegate_id: 'D0001' }), /already has a waiver/);
});

test('check-in with missing waivers requires a note', () => {
  const s = state();
  s.delegates[0].waiver_id = '';
  assert.throws(() => Changes.apply(s, ctx, 'check_in_school', { school_id: 'S1' }), /note is required/);
  Changes.apply(s, ctx, 'check_in_school', { school_id: 'S1', note: 'Form coming by email' });
  assert.strictEqual(s.schools[0].checked_in, true);
});

test('clean check-in needs no note; bad input is rejected', () => {
  const s = state();
  Changes.apply(s, ctx, 'check_in_school', { school_id: 'S1' });
  assert.strictEqual(s.schools[0].checked_in, true);
  assert.throws(() => Changes.apply(s, ctx, 'late_add', { school_id: 'S1', name: 'X', workshop: 'Bogus' }), /Unknown workshop/);
  assert.throws(() => Changes.apply(s, ctx, 'drop', { delegate_id: 'nope' }), /Unknown delegate/);
  assert.throws(() => Changes.apply(s, ctx, 'explode', {}), /Unknown action/);
});
