const test = require('node:test');
const assert = require('node:assert');
const Assign = require('../src/Assign');

function make() {
  const rooms = [1, 2, 3].map(i => ({ room_id: 'R' + i, workshop: 'Novice', capacity: 10 }));
  rooms.push({ room_id: 'R9', workshop: 'Chair', capacity: 30 });
  const delegates = [];
  let n = 0;
  const add = (school, count, workshop) => {
    for (let i = 0; i < count; i++) {
      delegates.push({ delegate_id: 'D' + ++n, school_id: school, workshop: workshop || 'Novice', status: 'registered', room_id: '', locked: false });
    }
  };
  add('A', 6); add('B', 4); add('C', 2);
  add('A', 3, 'Chair');
  return { rooms, delegates };
}

const counts = (s, w) => {
  const c = {};
  s.delegates.filter(d => d.workshop === w && d.room_id).forEach(d => (c[d.room_id] = (c[d.room_id] || 0) + 1));
  return Object.values(c);
};

test('room sizes stay within one and schools are spread', () => {
  const s = make();
  const r = Assign.run(s, { seed: 7 });
  assert.strictEqual(r.unplaced.length, 0);
  const sizes = counts(s, 'Novice');
  assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, sizes.join());
  const aPerRoom = {};
  s.delegates.filter(d => d.school_id === 'A' && d.workshop === 'Novice').forEach(d => (aPerRoom[d.room_id] = (aPerRoom[d.room_id] || 0) + 1));
  assert.deepStrictEqual(Object.values(aPerRoom), [2, 2, 2]);
});

test('same seed gives the same result', () => {
  const a = make(), b = make();
  Assign.run(a, { seed: 42 });
  Assign.run(b, { seed: 42 });
  assert.deepStrictEqual(a.delegates.map(d => d.room_id), b.delegates.map(d => d.room_id));
});

test('a drop and a late add move nobody already placed', () => {
  const s = make();
  Assign.run(s, { seed: 3 });
  const before = Object.fromEntries(s.delegates.map(d => [d.delegate_id, d.room_id]));
  s.delegates[0].status = 'dropped';
  s.delegates.push({ delegate_id: 'D99', school_id: 'B', workshop: 'Novice', status: 'late add', room_id: '', locked: false });
  const r = Assign.run(s, { seed: 3 });
  assert.strictEqual(r.moved, 0);
  assert.strictEqual(s.delegates[0].room_id, '');
  s.delegates.slice(1, -1).forEach(d => assert.strictEqual(d.room_id, before[d.delegate_id]));
  assert.ok(s.delegates[s.delegates.length - 1].room_id);
});

test('late add goes to the smallest room', () => {
  const s = make();
  Assign.run(s, { seed: 3 });
  const dropped = s.delegates.find(d => d.workshop === 'Novice');
  const freed = dropped.room_id;
  dropped.status = 'dropped';
  s.delegates.push({ delegate_id: 'D99', school_id: 'C', workshop: 'Novice', status: 'late add', room_id: '', locked: false });
  Assign.run(s, { seed: 3 });
  assert.strictEqual(s.delegates.find(d => d.delegate_id === 'D99').room_id, freed);
});

test('rebuild re-balances but never moves locked delegates', () => {
  const s = make();
  s.delegates.filter(d => d.workshop === 'Novice').forEach(d => { d.room_id = 'R1'; });
  s.delegates[0].locked = true;
  Assign.run(s, { seed: 5, rebuild: true });
  assert.strictEqual(s.delegates[0].room_id, 'R1');
  const sizes = counts(s, 'Novice');
  assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, sizes.join());
  assert.ok(new Set(s.delegates.filter(d => d.workshop === 'Novice').map(d => d.room_id)).size === 3);
});

test('full rooms leave overflow unplaced instead of overfilling', () => {
  const s = make();
  s.rooms.forEach(r => { if (r.workshop === 'Novice') r.capacity = 3; });
  const r = Assign.run(s, { seed: 1 });
  assert.strictEqual(r.unplaced.length, 3);
});
