const test = require('node:test');
const assert = require('node:assert');
const Waivers = require('../src/Waivers');

function state() {
  return {
    advisors: [{ advisor_id: 'A1', school_id: 'S1', name: 'Pat Lee', waiver_matched: 'FALSE' }],
    delegates: [
      { delegate_id: 'D1', school_id: 'S1', name: 'Annika Kettenring', status: 'registered', waiver_id: '' },
      { delegate_id: 'D2', school_id: 'S1', name: 'Lakpa Sherpa', status: 'registered', waiver_id: '' },
      { delegate_id: 'D3', school_id: 'S1', name: 'Gone Person', status: 'dropped', waiver_id: '' },
    ],
    waivers: [
      { waiver_id: 'W1', participant_name: ' lakpa  SHERPA ' },
      { waiver_id: 'W2', participant_name: 'Annika Kettering' },
      { waiver_id: 'W3', participant_name: 'Nobody Known' },
      { waiver_id: 'W4', participant_name: 'Pat Lee' },
    ],
  };
}

test('exact matches link automatically, near matches queue, others stay unlinked', () => {
  const s = state();
  const r = Waivers.run(s);
  assert.strictEqual(r.linked, 2);
  assert.strictEqual(s.delegates[1].waiver_id, 'W1');
  assert.strictEqual(s.advisors[0].waiver_matched, 'TRUE');
  assert.strictEqual(r.review.length, 1);
  assert.strictEqual(r.review[0].candidates[0].id, 'D1');
  assert.strictEqual(s.delegates[0].waiver_id, '', 'near match is never auto-linked');
  assert.deepStrictEqual(r.unlinked.map(w => w.waiver_id), ['W3']);
});

test('run is idempotent', () => {
  const s = state();
  Waivers.run(s);
  const r2 = Waivers.run(s);
  assert.strictEqual(r2.linked, 0);
  assert.strictEqual(s.delegates.filter(d => d.waiver_id).length, 1);
});

test('a human confirms a review-queue match', () => {
  const s = state();
  Waivers.run(s);
  Waivers.confirm(s, 'W2', 'D1');
  assert.strictEqual(s.delegates[0].waiver_id, 'W2');
  assert.strictEqual(s.waivers[1].match_status, 'manual');
});

test('dropped delegates are not candidates', () => {
  const s = state();
  s.waivers = [{ waiver_id: 'W9', participant_name: 'Gone Person' }];
  const r = Waivers.run(s);
  assert.strictEqual(r.linked, 0);
  assert.strictEqual(r.unlinked.length, 1);
});

test('two delegates with the same name go to review rather than guessing', () => {
  const s = state();
  s.delegates.push({ delegate_id: 'D9', school_id: 'S2', name: 'Lakpa Sherpa', status: 'registered', waiver_id: '' });
  s.waivers = [s.waivers[0]];
  const r = Waivers.run(s);
  assert.strictEqual(r.linked, 0);
  assert.strictEqual(r.review[0].candidates.length, 2);
});

test('ingest copies form responses once and a parent-signed form counts for the participant', () => {
  const s = { waivers: [] };
  const rows = [
    { Timestamp: '10/1 9:00', 'Participant Name': 'Kid One', 'Signer Name': 'Parent One', 'Date of Birth': '2010-01-01' },
    { Timestamp: '10/1 9:05', 'Participant Name': '', 'Signer Name': 'Blank' },
  ];
  assert.strictEqual(Waivers.ingest(s, rows), 1);
  assert.strictEqual(Waivers.ingest(s, rows), 0);
  assert.strictEqual(s.waivers[0].participant_name, 'Kid One');
  assert.strictEqual(s.waivers[0].waiver_id, 'W0001');
});
