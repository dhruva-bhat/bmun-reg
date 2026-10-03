/**
 * Waiver matching. Only exact normalized-name matches link automatically;
 * near matches go to a review queue; the rest stay unlinked.
 */
var Waivers = (function () {
  var N = typeof require !== 'undefined' ? require('./Normalize') : Normalize;
  var Ids_ = typeof require !== 'undefined' ? require('./Ids') : Ids;
  var MAX_NEAR_DISTANCE = 2;

  /**
   * Candidates: delegates and advisors as {kind, id, school_id, name}.
   * Returns {status: 'auto'|'needs review'|'none', candidate?, candidates?}.
   * An exact name shared by several people is ambiguous and goes to review.
   */
  function match(waiver, candidates) {
    var key = N.name(waiver.participant_name);
    if (!key) return { status: 'none' };
    var exact = candidates.filter(function (c) { return N.name(c.name) === key; });
    if (exact.length === 1) return { status: 'auto', candidate: exact[0] };
    if (exact.length > 1) return { status: 'needs review', candidates: exact };
    var near = candidates.filter(function (c) {
      return N.distance(N.name(c.name), key) <= MAX_NEAR_DISTANCE;
    });
    return near.length ? { status: 'needs review', candidates: near } : { status: 'none' };
  }

  /** Candidates not already claimed by another waiver. */
  function openCandidates(state) {
    var claimed = {};
    state.waivers.forEach(function (w) {
      if (w.matched_delegate_id && w.match_status !== 'needs review') claimed[w.matched_delegate_id] = true;
    });
    var out = [];
    state.delegates.forEach(function (d) {
      if (d.status !== 'dropped' && !claimed[d.delegate_id])
        out.push({ kind: 'delegate', id: d.delegate_id, school_id: d.school_id, name: d.name });
    });
    state.advisors.forEach(function (a) {
      if (!claimed[a.advisor_id]) out.push({ kind: 'advisor', id: a.advisor_id, school_id: a.school_id, name: a.name });
    });
    return out;
  }

  /** Link a waiver to a person: sets matched id on the waiver and the flag on the person. Mutates state. */
  function link(state, waiver, candidate, status) {
    waiver.matched_delegate_id = candidate.id;
    waiver.match_status = status;
    if (candidate.kind === 'delegate') {
      state.delegates.forEach(function (d) { if (d.delegate_id === candidate.id) d.waiver_id = waiver.waiver_id; });
    } else {
      state.advisors.forEach(function (a) { if (a.advisor_id === candidate.id) a.waiver_matched = 'TRUE'; });
    }
  }

  /**
   * Run the matcher over every unmatched waiver. Idempotent: matched waivers are skipped,
   * so a failed run can be repeated. Returns {linked, review: [{waiver, candidates}], unlinked: [waiver]}.
   */
  function run(state) {
    var result = { linked: 0, review: [], unlinked: [] };
    state.waivers.forEach(function (w) {
      if (w.match_status === 'auto' || w.match_status === 'manual') return;
      var m = match(w, openCandidates(state));
      if (m.status === 'auto') {
        link(state, w, m.candidate, 'auto');
        result.linked++;
      } else if (m.status === 'needs review') {
        w.match_status = 'needs review';
        result.review.push({ waiver: w, candidates: m.candidates });
      } else {
        w.match_status = '';
        result.unlinked.push(w);
      }
    });
    return result;
  }

  /** Human confirms a review-queue match, or enters a paper waiver by linking directly. */
  function confirm(state, waiverId, candidateId) {
    var w = state.waivers.filter(function (x) { return x.waiver_id === waiverId; })[0];
    if (!w) throw new Error('Unknown waiver ' + waiverId);
    var cands = openCandidates(state);
    var c = cands.filter(function (x) { return x.id === candidateId; })[0];
    if (!c) throw new Error('Unknown or already-matched person ' + candidateId);
    link(state, w, c, 'manual');
    return w;
  }

  var DEFAULT_COLUMNS = {
    timestamp: 'Timestamp',
    participant_name: 'Participant Name',
    date_of_birth: 'Date of Birth',
    signer: 'Signer Name',
  };

  /**
   * Copy raw form responses (kept read-only) into Waiver rows. Idempotent: a response is
   * identified by timestamp + normalized name, so re-running never duplicates rows.
   * A parent-signed waiver counts for the participant named on the form.
   */
  function ingest(state, rawRows, columns) {
    var col = Object.assign({}, DEFAULT_COLUMNS, columns || {});
    var seen = {};
    state.waivers.forEach(function (w) { seen[String(w.timestamp) + '|' + N.name(w.participant_name)] = true; });
    var added = 0;
    rawRows.forEach(function (r) {
      var name = String(r[col.participant_name] || '').trim();
      if (!name) return;
      var key = String(r[col.timestamp]) + '|' + N.name(name);
      if (seen[key]) return;
      seen[key] = true;
      state.waivers.push({
        waiver_id: Ids_.next('waiver', state.waivers.map(function (w) { return w.waiver_id; })),
        timestamp: r[col.timestamp], participant_name: name,
        date_of_birth: r[col.date_of_birth] || '', signer: r[col.signer] || '',
        matched_delegate_id: '', match_status: '',
      });
      added++;
    });
    return added;
  }

  return { ingest: ingest, DEFAULT_COLUMNS: DEFAULT_COLUMNS, match: match, run: run, confirm: confirm, link: link, openCandidates: openCandidates };
})();

if (typeof module !== 'undefined') module.exports = Waivers;
