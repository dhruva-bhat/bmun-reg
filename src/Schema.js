/** Table definitions for the master tables. Header order here is the sheet column order. */
var Schema = (function () {
  var TABLES = {
    schools: { sheet: 'School', key: 'school_id', headers: ['school_id', 'name', 'aliases', 'cap_novice', 'cap_advanced', 'cap_crisis', 'cap_chair', 'checked_in'] },
    advisors: { sheet: 'Advisor', key: 'advisor_id', headers: ['advisor_id', 'school_id', 'name', 'phone', 'email', 'waiver_matched'] },
    delegates: { sheet: 'Delegate', key: 'delegate_id', headers: ['delegate_id', 'school_id', 'name', 'workshop', 'status', 'waiver_id', 'room_id', 'locked'] },
    waivers: { sheet: 'Waiver', key: 'waiver_id', headers: ['waiver_id', 'timestamp', 'participant_name', 'date_of_birth', 'signer', 'matched_delegate_id', 'match_status'] },
    rooms: { sheet: 'Room', key: 'room_id', headers: ['room_id', 'workshop', 'display_name', 'building_code', 'capacity'] },
    payments: { sheet: 'Payment', key: 'payment_id', headers: ['payment_id', 'school_id', 'registration_amount', 'invoice_fee', 'amount_paid', 'credited_back', 'refund_amount', 'refunded'] },
    changeLog: { sheet: 'Change Log', key: 'log_id', headers: ['log_id', 'timestamp', 'user', 'table', 'row', 'field', 'old_value', 'new_value'] },
  };

  /** Build an empty in-memory state. */
  function emptyState() {
    var s = { seed: 1 };
    Object.keys(TABLES).forEach(function (k) { s[k] = []; });
    return s;
  }

  /** Convert sheet values (header row + data rows) to objects, skipping blank rows. */
  function toObjects(values, headers) {
    if (!values.length) return [];
    var head = values[0].map(String);
    return values.slice(1)
      .filter(function (r) { return r.some(function (c) { return c !== '' && c != null; }); })
      .map(function (r) {
        var o = {};
        headers.forEach(function (h) {
          var i = head.indexOf(h);
          o[h] = i === -1 || r[i] == null ? '' : r[i];
        });
        return o;
      });
  }

  /** Convert objects to a values grid (header row first). */
  function toValues(objects, headers) {
    return [headers.slice()].concat(objects.map(function (o) {
      return headers.map(function (h) { return o[h] == null ? '' : o[h]; });
    }));
  }

  return { TABLES: TABLES, emptyState: emptyState, toObjects: toObjects, toValues: toValues };
})();

if (typeof module !== 'undefined') module.exports = Schema;
