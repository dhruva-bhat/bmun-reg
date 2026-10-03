/** Minimal RFC 4180 CSV parse/stringify. */
var Csv = (function () {
  /** Parse CSV text to an array of row arrays. */
  function parse(text) {
    var rows = [], row = [], field = '', inQuotes = false;
    text = String(text).replace(/^﻿/, '');
    for (var i = 0; i < text.length; i++) {
      var c = text.charAt(i);
      if (inQuotes) {
        if (c === '"') {
          if (text.charAt(i + 1) === '"') { field += '"'; i++; } else inQuotes = false;
        } else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text.charAt(i + 1) === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += c;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return !(r.length === 1 && r[0] === ''); });
  }

  /** Parse with a header row into an array of objects keyed by header. */
  function parseObjects(text) {
    var rows = parse(text);
    if (!rows.length) return [];
    var head = rows[0].map(function (h) { return h.trim(); });
    return rows.slice(1).map(function (r) {
      var o = {};
      head.forEach(function (h, i) { o[h] = r[i] == null ? '' : r[i]; });
      return o;
    });
  }

  function cell(v) {
    var s = v == null ? '' : String(v);
    // Neutralize spreadsheet formula injection from user-typed names.
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function stringify(rows) {
    return rows.map(function (r) { return r.map(cell).join(','); }).join('\r\n') + '\r\n';
  }

  return { parse: parse, parseObjects: parseObjects, stringify: stringify };
})();

if (typeof module !== 'undefined') module.exports = Csv;
