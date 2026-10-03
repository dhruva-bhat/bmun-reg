const test = require('node:test');
const assert = require('node:assert');
const CheckIn = require('../src/CheckIn');

const state = {
  schools: [{ school_id: 'S1', name: 'Acalanes', aliases: 'ACALANES HS', cap_novice: 2, checked_in: false, insurance: 'secret' }],
  advisors: [{ advisor_id: 'A1', school_id: 'S1', name: 'Pat Lee', phone: '555-0100', waiver_matched: 'TRUE' }],
  delegates: [
    { delegate_id: 'D1', school_id: 'S1', name: 'Ann', workshop: 'Novice', status: 'registered', waiver_id: 'W1', room_id: 'R1' },
    { delegate_id: 'D2', school_id: 'S1', name: 'Bob', workshop: 'Novice', status: 'registered', waiver_id: '', room_id: '' },
  ],
  rooms: [{ room_id: 'R1', display_name: 'Novice 1' }],
};

test('search finds a school by alias', () => {
  assert.deepStrictEqual(CheckIn.search(state, 'acalanes hs'), [{ school_id: 'S1', name: 'Acalanes' }]);
});

test('school view carries counts and rooms but no personal data', () => {
  const v = CheckIn.schoolView(state, 'S1');
  assert.deepStrictEqual(v.summary, { advisorWaiver: true, registered: 2, waivers: 1, missing: 1, status: 'red' });
  assert.strictEqual(v.delegates[0].room, 'Novice 1');
  const json = JSON.stringify(v);
  assert.ok(!json.includes('555-0100') && !json.includes('secret'));
});

test('missing-waiver CSV for one school and for all', () => {
  assert.strictEqual(CheckIn.missingCsv(state, 'S1'), 'School,Name,Role,Workshop\r\nAcalanes,Bob,Delegate,Novice\r\n');
  assert.strictEqual(CheckIn.missingCsv(state), CheckIn.missingCsv(state, 'S1'));
});
