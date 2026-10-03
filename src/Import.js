/**
 * Registration import (Aldous export or the registration form). Input rows are one per delegate.
 * Column names come from a config map so a renamed question is a one-line fix.
 * Idempotent: re-importing the same rows creates nothing new.
 */
var Import = (function () {
  var req = typeof require !== 'undefined';
  var N = req ? require('./Normalize') : Normalize;
  var Ids_ = req ? require('./Ids') : Ids;
  var Schools_ = req ? require('./Schools') : Schools;
  var Counts_ = req ? require('./Counts') : Counts;

  var DEFAULT_COLUMNS = {
    school: 'School',
    advisor_name: 'Advisor Name',
    advisor_email: 'Advisor Email',
    advisor_phone: 'Advisor Phone',
    delegate_name: 'Delegate Name',
    workshop: 'Workshop',
  };

  function ids(rows, f) { return rows.map(function (r) { return r[f]; }); }

  /**
   * Import rows into state. Returns {schools, advisors, delegates, unmapped: [raw names], skipped: [{row, reason}]}.
   * New school names are never auto-created unless options.createSchools is true (first load only);
   * otherwise they are returned in `unmapped` for an admin to map.
   */
  function registration(state, rows, columns, options) {
    var col = Object.assign({}, DEFAULT_COLUMNS, columns || {});
    options = options || {};
    var out = { schools: 0, advisors: 0, delegates: 0, unmapped: [], skipped: [] };
    var unmapped = {};

    rows.forEach(function (row, i) {
      var rawSchool = String(row[col.school] || '').trim();
      var name = String(row[col.delegate_name] || '').trim();
      var workshop = String(row[col.workshop] || '').trim();
      var advisorName = String(row[col.advisor_name] || '').trim();

      if (!rawSchool) { out.skipped.push({ row: i + 2, reason: 'no school' }); return; }

      var r = Schools_.resolve(state.schools, rawSchool);
      var school_id = r.school_id;
      if (!school_id) {
        if (!options.createSchools) {
          unmapped[rawSchool] = true;
          return;
        }
        school_id = Ids_.next('school', ids(state.schools, 'school_id'));
        state.schools.push({
          school_id: school_id, name: rawSchool, aliases: '',
          cap_novice: '', cap_advanced: '', cap_crisis: '', cap_chair: '', checked_in: false,
        });
        out.schools++;
      }

      if (advisorName && !state.advisors.some(function (a) { return a.school_id === school_id && N.name(a.name) === N.name(advisorName); })) {
        state.advisors.push({
          advisor_id: Ids_.next('advisor', ids(state.advisors, 'advisor_id')), school_id: school_id, name: advisorName,
          phone: row[col.advisor_phone] || '', email: row[col.advisor_email] || '', waiver_matched: 'FALSE',
        });
        out.advisors++;
      }

      if (!name) return; // advisor-only row
      if (Counts_.WORKSHOPS.indexOf(workshop) === -1) { out.skipped.push({ row: i + 2, reason: 'unknown workshop "' + workshop + '"' }); return; }
      var dup = state.delegates.some(function (d) {
        return d.school_id === school_id && N.name(d.name) === N.name(name);
      });
      if (dup) return;
      state.delegates.push({
        delegate_id: Ids_.next('delegate', ids(state.delegates, 'delegate_id')), school_id: school_id, name: name,
        workshop: workshop, status: 'registered', waiver_id: '', room_id: '', locked: false,
      });
      out.delegates++;
    });

    out.unmapped = Object.keys(unmapped);
    setCaps(state);
    return out;
  }

  /** Record each school's registered cap from its delegate rows; caps only ever go down afterwards. */
  function setCaps(state) {
    state.schools.forEach(function (s) {
      Counts_.WORKSHOPS.forEach(function (w) {
        var key = 'cap_' + w.toLowerCase();
        if (s[key] === '' || s[key] == null) {
          s[key] = state.delegates.filter(function (d) { return d.school_id === s.school_id && d.workshop === w && d.status !== 'late add'; }).length;
        }
      });
    });
  }

  return { registration: registration, DEFAULT_COLUMNS: DEFAULT_COLUMNS };
})();

if (typeof module !== 'undefined') module.exports = Import;
