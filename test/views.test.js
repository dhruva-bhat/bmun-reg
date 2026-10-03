const test = require('node:test');
const assert = require('node:assert');
const Views = require('../src/Views');
const Waivers = require('../src/Waivers');

function state() {
  const s = {
    schools: [{ school_id: 'S1', name: 'Acalanes', cap_novice: 2, cap_advanced: 0, cap_crisis: 0, cap_chair: 0, checked_in: false }],
    advisors: [{ advisor_id: 'A1', school_id: 'S1', name: 'Pat Lee', waiver_matched: 'FALSE' }],
    delegates: [
      { delegate_id: 'D1', school_id: 'S1', name: 'Ann', workshop: 'Novice', status: 'registered', waiver_id: 'W1', room_id: 'R1' },
      { delegate_id: 'D2', school_id: 'S1', name: 'Bob', workshop: 'Novice', status: 'registered', waiver_id: '', room_id: 'R1' },
      { delegate_id: 'D3', school_id: 'S1', name: 'Cy', workshop: 'Novice', status: 'dropped', waiver_id: '', room_id: '' },
    ],
    waivers: [{ waiver_id: 'W1', participant_name: 'Ann', matched_delegate_id: 'D1', match_status: 'auto' },
      { waiver_id: 'W2', participant_name: 'Bobb' }, { waiver_id: 'W3', participant_name: 'Zed' }],
    rooms: [{ room_id: 'R1', workshop: 'Novice', display_name: 'Novice 1', building_code: 'DWIN243', capacity: 10 }],
  };
  Waivers.run(s);
  return s;
}

test('school summary uses derived counts', () => {
  const g = Views.schoolSummary(state());
  assert.deepStrictEqual(g[1], ['Acalanes', 'no', 2, 2, 2, 0, 0, 0, 1, 1, 0, 'red', '']);
});

test('rosters list active delegates per room', () => {
  const g = Views.rosters(state());
  assert.deepStrictEqual(g.slice(1).map(r => r[3]), ['Ann', 'Bob']);
  assert.strictEqual(g[1][0], 'Novice 1');
});

test('review queue shows near misses; unlinked list shows the rest', () => {
  const s = state();
  assert.deepStrictEqual(Views.reviewQueue(s)[1].slice(0, 5), ['W2', 'Bobb', 'Bob', 'D2', 'Acalanes']);
  assert.deepStrictEqual(Views.unlinkedWaivers(s).slice(1).map(r => r[0]), ['W3']);
});

test('missing waivers lists advisor and delegates, scoped by school', () => {
  const s = state();
  const g = Views.missingWaivers(s, 'S1');
  assert.deepStrictEqual(g.slice(1).map(r => r[1] + ':' + r[2]), ['Pat Lee:Advisor', 'Bob:Delegate']);
  assert.strictEqual(Views.missingWaivers(s, 'S9').length, 1);
});
