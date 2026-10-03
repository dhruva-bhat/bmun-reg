/** Pure payloads for the front desk page. Names and waiver status only: never DOB, insurance or phone. */
var CheckIn = (function () {
  var req = typeof require !== 'undefined';
  var Schools_ = req ? require('./Schools') : Schools;
  var Counts_ = req ? require('./Counts') : Counts;
  var Views_ = req ? require('./Views') : Views;
  var Csv_ = req ? require('./Csv') : Csv;

  function search(state, query) {
    return Schools_.search(state.schools, query).slice(0, 20)
      .map(function (s) { return { school_id: s.school_id, name: s.name }; });
  }

  /** Everything the page shows for one school. */
  function schoolView(state, schoolId) {
    var s = state.schools.filter(function (x) { return x.school_id === schoolId; })[0];
    if (!s) throw new Error('Unknown school ' + schoolId);
    var c = Counts_.forSchool(s, state.advisors, state.delegates);
    var rooms = {};
    state.rooms.forEach(function (r) { rooms[r.room_id] = r.display_name || r.room_id; });
    return {
      school_id: s.school_id,
      name: s.name,
      checkedIn: Counts_.isTrue(s.checked_in),
      summary: { advisorWaiver: c.advisorWaiver, registered: c.attendees, waivers: c.waivers, missing: c.missing, status: c.status },
      advisors: state.advisors.filter(function (a) { return a.school_id === schoolId; })
        .map(function (a) { return { advisor_id: a.advisor_id, name: a.name, waiver: Counts_.isTrue(a.waiver_matched) }; }),
      delegates: state.delegates.filter(function (d) { return d.school_id === schoolId; })
        .map(function (d) {
          return { delegate_id: d.delegate_id, name: d.name, workshop: d.workshop, status: d.status,
            waiver: !!d.waiver_id, room: rooms[d.room_id] || '' };
        }),
    };
  }

  /** CSV text of people without a waiver, for one school or all (schoolId empty). */
  function missingCsv(state, schoolId) {
    return Csv_.stringify(Views_.missingWaivers(state, schoolId || ''));
  }

  return { search: search, schoolView: schoolView, missingCsv: missingCsv };
})();

if (typeof module !== 'undefined') module.exports = CheckIn;
