/** Read-only views derived from the master tables. Each returns a values grid (header row first). */
var Views = (function () {
  var req = typeof require !== 'undefined';
  var Counts_ = req ? require('./Counts') : Counts;
  var Waivers_ = req ? require('./Waivers') : Waivers;

  function byId(rows, f) {
    var m = {};
    rows.forEach(function (r) { m[r[f]] = r; });
    return m;
  }

  function schoolSummary(state) {
    var head = ['School', 'Advisor waiver', 'Registered cap', 'Attendees', 'Novice', 'Advanced', 'Crisis', 'Chair', 'Waivers', 'Missing', 'Open spots', 'Waiver status', 'Checked in'];
    var rows = state.schools.map(function (s) {
      var c = Counts_.forSchool(s, state.advisors, state.delegates);
      return [s.name, c.advisorWaiver ? 'yes' : 'no', c.cap, c.attendees, c.byWorkshop.Novice, c.byWorkshop.Advanced,
        c.byWorkshop.Crisis, c.byWorkshop.Chair, c.waivers, c.missing, c.openSpots, c.status, Counts_.isTrue(s.checked_in) ? 'yes' : ''];
    });
    return [head].concat(rows);
  }

  /** One block per room: header line then delegates, ordered by room. */
  function rosters(state) {
    var schools = byId(state.schools, 'school_id');
    var head = ['Room', 'Workshop', 'Building', 'Name', 'School', 'Status'];
    var rows = [];
    state.rooms.forEach(function (r) {
      state.delegates
        .filter(function (d) { return d.room_id === r.room_id && d.status !== 'dropped'; })
        .sort(function (a, b) { return a.name < b.name ? -1 : 1; })
        .forEach(function (d) {
          rows.push([r.display_name || r.room_id, r.workshop, r.building_code || '', d.name,
            (schools[d.school_id] || {}).name || d.school_id, d.status]);
        });
    });
    return [head].concat(rows);
  }

  /** Near-miss waivers with both names and the school, for one-click confirm. */
  function reviewQueue(state) {
    var schools = byId(state.schools, 'school_id');
    var people = Waivers_.openCandidates(state);
    var head = ['waiver_id', 'Waiver name', 'Possible person', 'person_id', 'School', 'Confirm (set to TRUE)'];
    var rows = [];
    state.waivers.filter(function (w) { return w.match_status === 'needs review'; }).forEach(function (w) {
      var m = Waivers_.match(w, people);
      (m.candidates || []).forEach(function (c) {
        rows.push([w.waiver_id, w.participant_name, c.name, c.id, (schools[c.school_id] || {}).name || c.school_id, false]);
      });
    });
    return [head].concat(rows);
  }

  function unlinkedWaivers(state) {
    var head = ['waiver_id', 'Timestamp', 'Participant name'];
    return [head].concat(state.waivers
      .filter(function (w) { return !w.matched_delegate_id && w.match_status !== 'needs review'; })
      .map(function (w) { return [w.waiver_id, w.timestamp, w.participant_name]; }));
  }

  /** Delegates and advisors without a waiver, for one school or (schoolId omitted) all schools. */
  function missingWaivers(state, schoolId) {
    var schools = byId(state.schools, 'school_id');
    var head = ['School', 'Name', 'Role', 'Workshop'];
    var rows = [];
    state.schools.forEach(function (s) {
      if (schoolId && s.school_id !== schoolId) return;
      state.advisors.filter(function (a) { return a.school_id === s.school_id && !Counts_.isTrue(a.waiver_matched); })
        .forEach(function (a) { rows.push([s.name, a.name, 'Advisor', '']); });
      state.delegates.filter(function (d) { return d.school_id === s.school_id && d.status !== 'dropped' && !d.waiver_id; })
        .forEach(function (d) { rows.push([s.name, d.name, 'Delegate', d.workshop]); });
    });
    return [head].concat(rows);
  }

  return { schoolSummary: schoolSummary, rosters: rosters, reviewQueue: reviewQueue, unlinkedWaivers: unlinkedWaivers, missingWaivers: missingWaivers };
})();

if (typeof module !== 'undefined') module.exports = Views;
