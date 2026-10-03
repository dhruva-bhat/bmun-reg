/**
 * Waiver matching. Only exact normalized-name matches link automatically;
 * near matches go to a review queue; the rest stay unlinked.
 */
var Waivers = (function () {
  var N = typeof require !== 'undefined' ? require('./Normalize') : Normalize;
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

  return { match: match, run: run, confirm: confirm, link: link, openCandidates: openCandidates };
})();

if (typeof module !== 'undefined') module.exports = Waivers;
