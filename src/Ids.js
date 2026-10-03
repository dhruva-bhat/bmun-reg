/** Stable ID generation. IDs are generated once and never typed by hand. */
var Ids = (function () {
  var PREFIX = { school: 'S', advisor: 'A', delegate: 'D', waiver: 'W', room: 'R', payment: 'P', log: 'L' };

  /** Next ID for a kind given the IDs already in use, e.g. D0001, D0002. */
  function next(kind, existing) {
    var prefix = PREFIX[kind];
    if (!prefix) throw new Error('Unknown ID kind: ' + kind);
    var max = 0;
    (existing || []).forEach(function (id) {
      var m = new RegExp('^' + prefix + '(\\d+)$').exec(String(id));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    var n = String(max + 1);
    while (n.length < 4) n = '0' + n;
    return prefix + n;
  }

  return { next: next };
})();

if (typeof module !== 'undefined') module.exports = Ids;
