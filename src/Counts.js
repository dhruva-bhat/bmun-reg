/** Per-school totals derived from Delegate rows. The only typed number is the registered cap. */
var Counts = (function () {
  var WORKSHOPS = ['Novice', 'Advanced', 'Crisis', 'Chair'];

  function isActive(d) { return d.status !== 'dropped'; }

  function isTrue(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }

  /** Totals for one school. Waivers count active delegates with a linked waiver. */
  function forSchool(school, advisors, delegates) {
    var mine = delegates.filter(function (d) { return d.school_id === school.school_id && isActive(d); });
    var byWorkshop = {};
    WORKSHOPS.forEach(function (w) {
      byWorkshop[w] = mine.filter(function (d) { return d.workshop === w; }).length;
    });
    var waivers = mine.filter(function (d) { return !!d.waiver_id; }).length;
    var advs = advisors.filter(function (a) { return a.school_id === school.school_id; });
    var advisorWaiver = advs.length > 0 && advs.every(function (a) { return isTrue(a.waiver_matched); });
    var capTotal = 0;
    WORKSHOPS.forEach(function (w) { capTotal += Number(school['cap_' + w.toLowerCase()]) || 0; });
    return {
      school_id: school.school_id,
      attendees: mine.length,
      byWorkshop: byWorkshop,
      waivers: waivers,
      missing: mine.length - waivers,
      advisorWaiver: advisorWaiver,
      cap: capTotal,
      openSpots: Math.max(0, capTotal - mine.length),
      // Green when waivers equal delegates, red when under (same rule as the Master tab).
      status: waivers >= mine.length ? 'green' : 'red',
    };
  }

  /**
   * The registered cap can go down but never up. Returns the cap to store:
   * the new value when it is lower, otherwise the old one.
   */
  function applyCap(oldCap, newCap) {
    var o = Number(oldCap), n = Number(newCap);
    if (isNaN(n)) return oldCap;
    if (oldCap === '' || oldCap == null || isNaN(o)) return n;
    return Math.min(o, n);
  }

  return { WORKSHOPS: WORKSHOPS, forSchool: forSchool, applyCap: applyCap, isTrue: isTrue };
})();

if (typeof module !== 'undefined') module.exports = Counts;
