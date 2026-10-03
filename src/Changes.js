/**
 * Day-of changes. Every action is validated, applied to the master tables, written to
 * the change log, and followed by an incremental room placement (nobody already placed moves).
 */
var Changes = (function () {
  var req = typeof require !== 'undefined';
  var Ids_ = req ? require('./Ids') : Ids;
  var Assign_ = req ? require('./Assign') : Assign;
  var Counts_ = req ? require('./Counts') : Counts;

  var WORKSHOPS = ['Novice', 'Advanced', 'Crisis', 'Chair'];

  function find(rows, field, id) {
    return rows.filter(function (r) { return r[field] === id; })[0];
  }

  function log(state, ctx, table, row, field, oldValue, newValue) {
    state.changeLog.push({
      log_id: Ids_.next('log', state.changeLog.map(function (l) { return l.log_id; })),
      timestamp: ctx.now,
      user: ctx.user,
      table: table,
      row: row,
      field: field,
      old_value: oldValue == null ? '' : oldValue,
      new_value: newValue == null ? '' : newValue,
    });
  }

  function set(state, ctx, table, idField, obj, field, value) {
    if (obj[field] === value) return;
    log(state, ctx, table, obj[idField], field, obj[field], value);
    obj[field] = value;
  }

  function delegateOrThrow(state, id) {
    var d = find(state.delegates, 'delegate_id', id);
    if (!d) throw new Error('Unknown delegate ' + id);
    return d;
  }

  function checkWorkshop(w) {
    if (WORKSHOPS.indexOf(w) === -1) throw new Error('Unknown workshop ' + w);
  }

  function replace(state, ctx) {
    return Assign_.run(state, { seed: state.seed });
  }

  var actions = {
    drop: function (state, ctx, p) {
      var d = delegateOrThrow(state, p.delegate_id);
      set(state, ctx, 'Delegate', 'delegate_id', d, 'status', 'dropped');
      set(state, ctx, 'Delegate', 'delegate_id', d, 'room_id', '');
      return d;
    },

    late_add: function (state, ctx, p) {
      if (!find(state.schools, 'school_id', p.school_id)) throw new Error('Unknown school ' + p.school_id);
      if (!String(p.name || '').trim()) throw new Error('Name is required');
      checkWorkshop(p.workshop);
      var d = {
        delegate_id: Ids_.next('delegate', state.delegates.map(function (x) { return x.delegate_id; })),
        school_id: p.school_id, name: String(p.name).trim(), workshop: p.workshop,
        status: 'late add', waiver_id: '', room_id: '', locked: false,
      };
      state.delegates.push(d);
      log(state, ctx, 'Delegate', d.delegate_id, 'status', '', 'late add');
      return d;
    },

    fix_name: function (state, ctx, p) {
      var d = delegateOrThrow(state, p.delegate_id);
      if (!String(p.name || '').trim()) throw new Error('Name is required');
      set(state, ctx, 'Delegate', 'delegate_id', d, 'name', String(p.name).trim());
      return d;
    },

    change_workshop: function (state, ctx, p) {
      var d = delegateOrThrow(state, p.delegate_id);
      checkWorkshop(p.workshop);
      if (d.workshop !== p.workshop) {
        set(state, ctx, 'Delegate', 'delegate_id', d, 'workshop', p.workshop);
        set(state, ctx, 'Delegate', 'delegate_id', d, 'room_id', '');
        set(state, ctx, 'Delegate', 'delegate_id', d, 'locked', false);
      }
      return d;
    },

    /** Paper waiver received at the desk: creates a manual Waiver row linked to the person. */
    paper_waiver: function (state, ctx, p) {
      var person = p.delegate_id ? delegateOrThrow(state, p.delegate_id) : find(state.advisors, 'advisor_id', p.advisor_id);
      if (!person) throw new Error('Unknown person');
      var isDelegate = !!p.delegate_id;
      if (isDelegate && person.waiver_id) throw new Error(person.name + ' already has a waiver');
      var w = {
        waiver_id: Ids_.next('waiver', state.waivers.map(function (x) { return x.waiver_id; })),
        timestamp: ctx.now, participant_name: person.name, date_of_birth: '', signer: 'paper',
        matched_delegate_id: isDelegate ? person.delegate_id : person.advisor_id, match_status: 'manual',
      };
      state.waivers.push(w);
      log(state, ctx, 'Waiver', w.waiver_id, 'match_status', '', 'manual');
      if (isDelegate) set(state, ctx, 'Delegate', 'delegate_id', person, 'waiver_id', w.waiver_id);
      else set(state, ctx, 'Advisor', 'advisor_id', person, 'waiver_matched', 'TRUE');
      return w;
    },

    /** Mark a school fully checked in; warns and needs a note if waivers are missing. */
    check_in_school: function (state, ctx, p) {
      var s = find(state.schools, 'school_id', p.school_id);
      if (!s) throw new Error('Unknown school ' + p.school_id);
      var c = Counts_.forSchool(s, state.advisors, state.delegates);
      var gaps = c.missing > 0 || !c.advisorWaiver;
      if (gaps && !String(p.note || '').trim())
        throw new Error('Waivers are missing (' + c.missing + ' delegates' + (c.advisorWaiver ? '' : ', advisor') + '); a note is required to check in.');
      set(state, ctx, 'School', 'school_id', s, 'checked_in', true);
      if (gaps) log(state, ctx, 'School', s.school_id, 'check_in_note', '', String(p.note).trim());
      return s;
    },
  };

  /**
   * Apply one action. ctx = {user, now}. Returns {result, placement, counts}.
   * Throws (leaving state partly changed only after validation) on bad input.
   */
  function apply(state, ctx, action, params) {
    if (!actions[action]) throw new Error('Unknown action ' + action);
    var result = actions[action](state, ctx, params || {});
    var placement = replace(state, ctx);
    return { result: result, placement: placement };
  }

  return { apply: apply, ACTIONS: Object.keys(actions), WORKSHOPS: WORKSHOPS };
})();

if (typeof module !== 'undefined') module.exports = Changes;
