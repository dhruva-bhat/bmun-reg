/** School canonical names and aliases. Unknown names are flagged, never auto-created. */
var Schools = (function () {
  var N = typeof require !== 'undefined' ? require('./Normalize') : Normalize;

  function aliasList(school) {
    return String(school.aliases || '')
      .split(/[,;\n]/)
      .map(function (a) { return a.trim(); })
      .filter(Boolean);
  }

  /** Map of normalized name/alias -> school_id. */
  function index(schools) {
    var map = {};
    schools.forEach(function (s) {
      [s.name].concat(aliasList(s)).forEach(function (n) {
        var key = N.name(n);
        if (key && !map[key]) map[key] = s.school_id;
      });
    });
    return map;
  }

  /** Resolve a typed school name. Returns {school_id} or {unmapped: true, raw}. */
  function resolve(schools, raw) {
    var id = index(schools)[N.name(raw)];
    return id ? { school_id: id } : { unmapped: true, raw: String(raw) };
  }

  /** Add an alias to a school (admin mapping of a flagged name). Returns a new school object. */
  function addAlias(school, alias) {
    var list = aliasList(school);
    var key = N.name(alias);
    if (!list.some(function (a) { return N.name(a) === key; }) && N.name(school.name) !== key) list.push(alias.trim());
    return Object.assign({}, school, { aliases: list.join(', ') });
  }

  /** Search for the check-in page: schools whose name or any alias contains the query. */
  function search(schools, query) {
    var q = N.name(query);
    if (!q) return [];
    return schools.filter(function (s) {
      return [s.name].concat(aliasList(s)).some(function (n) { return N.name(n).indexOf(q) !== -1; });
    });
  }

  return { aliasList: aliasList, resolve: resolve, addAlias: addAlias, search: search };
})();

if (typeof module !== 'undefined') module.exports = Schools;
