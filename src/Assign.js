/**
 * Room assignment engine. Rules, in order:
 *  1. Keep room sizes within one person of each other.
 *  2. Put each delegate in the room with the fewest people from their school.
 *  3. Break ties randomly with a saved seed (reproducible).
 *  4. Never move someone already marked as placed (locked).
 * Chair Training has one room, so school spread does not matter there.
 */
var Assign = (function () {
  /** Small seeded PRNG (mulberry32). */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function isLocked(d) { return d.locked === true || String(d.locked).toUpperCase() === 'TRUE'; }

  function shuffle(arr, rand) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /** Pick the best-fit room for a delegate given current occupancy. Returns a room or null if all are full. */
  function bestRoom(delegate, rooms, occupants, rand) {
    var open = rooms.filter(function (r) {
      return !r.capacity || occupants[r.room_id].length < Number(r.capacity);
    });
    if (!open.length) return null;
    var min = Math.min.apply(null, open.map(function (r) { return occupants[r.room_id].length; }));
    var smallest = open.filter(function (r) { return occupants[r.room_id].length === min; });
    var pool = smallest;
    if (delegate.workshop !== 'Chair') {
      var fromSchool = function (r) {
        return occupants[r.room_id].filter(function (d) { return d.school_id === delegate.school_id; }).length;
      };
      var fewest = Math.min.apply(null, smallest.map(fromSchool));
      pool = smallest.filter(function (r) { return fromSchool(r) === fewest; });
    }
    return pool[Math.floor(rand() * pool.length)];
  }

  /**
   * Assign rooms in place.
   * options.seed: saved seed. options.rebuild: when true, unlocked delegates are re-balanced;
   * otherwise only delegates without a room are placed and nobody already placed moves.
   * Returns {placed, unplaced: [delegate], moved}.
   */
  function run(state, options) {
    options = options || {};
    var rand = rng(options.seed == null ? 1 : options.seed);
    var result = { placed: 0, unplaced: [], moved: 0 };

    // Dropped delegates free their seat.
    state.delegates.forEach(function (d) {
      if (d.status === 'dropped') { d.room_id = ''; d.locked = false; }
    });

    var workshops = {};
    state.rooms.forEach(function (r) { workshops[r.workshop] = true; });

    Object.keys(workshops).forEach(function (w) {
      var rooms = state.rooms.filter(function (r) { return r.workshop === w; });
      var roomIds = rooms.map(function (r) { return r.room_id; });
      var mine = state.delegates.filter(function (d) { return d.status !== 'dropped' && d.workshop === w; });

      var occupants = {};
      rooms.forEach(function (r) { occupants[r.room_id] = []; });
      var todo = [];
      mine.forEach(function (d) {
        var inKnownRoom = roomIds.indexOf(d.room_id) !== -1;
        var keep = inKnownRoom && (isLocked(d) || !options.rebuild);
        if (keep) occupants[d.room_id].push(d);
        else todo.push(d);
      });

      // Larger schools first so they spread best; seeded shuffle keeps ties reproducible.
      var size = {};
      todo.forEach(function (d) { size[d.school_id] = (size[d.school_id] || 0) + 1; });
      todo = shuffle(todo, rand).sort(function (a, b) { return size[b.school_id] - size[a.school_id]; });

      todo.forEach(function (d) {
        var before = d.room_id;
        var room = bestRoom(d, rooms, occupants, rand);
        if (!room) { d.room_id = ''; result.unplaced.push(d); return; }
        d.room_id = room.room_id;
        occupants[room.room_id].push(d);
        if (before && before !== d.room_id) result.moved++;
        result.placed++;
      });
    });
    return result;
  }

  return { run: run, rng: rng };
})();

if (typeof module !== 'undefined') module.exports = Assign;
