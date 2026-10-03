const test = require('node:test');
const assert = require('node:assert');
const Counts = require('../src/Counts');

const school = { school_id: 'S1', cap_novice: 3, cap_advanced: 2, cap_crisis: 0, cap_chair: 1 };
const advisors = [{ advisor_id: 'A1', school_id: 'S1', waiver_matched: 'TRUE' }];
const delegates = [
  { delegate_id: 'D1', school_id: 'S1', workshop: 'Novice', status: 'registered', waiver_id: 'W1' },
  { delegate_id: 'D2', school_id: 'S1', workshop: 'Novice', status: 'registered', waiver_id: '' },
  { delegate_id: 'D3', school_id: 'S1', workshop: 'Chair', status: 'dropped', waiver_id: '' },
  { delegate_id: 'D4', school_id: 'S2', workshop: 'Novice', status: 'registered', waiver_id: 'W2' },
];

test('totals ignore dropped delegates and other schools', () => {
  const c = Counts.forSchool(school, advisors, delegates);
  assert.strictEqual(c.attendees, 2);
  assert.strictEqual(c.byWorkshop.Novice, 2);
  assert.strictEqual(c.byWorkshop.Chair, 0);
  assert.strictEqual(c.waivers, 1);
  assert.strictEqual(c.missing, 1);
  assert.strictEqual(c.status, 'red');
  assert.strictEqual(c.advisorWaiver, true);
  assert.strictEqual(c.cap, 6);
  assert.strictEqual(c.openSpots, 4);
});

test('green when waivers equal delegates', () => {
  const c = Counts.forSchool(school, advisors, [delegates[0]]);
  assert.strictEqual(c.status, 'green');
});

test('cap can decrease but never increase', () => {
  assert.strictEqual(Counts.applyCap(10, 6), 6);
  assert.strictEqual(Counts.applyCap(6, 10), 6);
  assert.strictEqual(Counts.applyCap('', 4), 4);
});
