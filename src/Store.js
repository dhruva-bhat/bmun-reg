/** Apps Script only: load and save the master tables from the bound spreadsheet. */
var Store = (function () {
  var CONFIG_SHEET = 'Config';
  var CONFIG_DEFAULTS = [
    ['key', 'value', 'note'],
    ['seed', '1', 'Saved seed for room assignment; change to reshuffle on Rebuild'],
    ['staff_emails', '', 'Comma-separated Google accounts allowed to open the check-in page'],
    ['registration_sheet', 'Registration Import', 'Tab holding the registration rows (paste Aldous CSV here)'],
    ['waiver_sheet', 'Form Responses 1', 'Raw waiver form responses (never edited)'],
    ['col_school', 'School', 'Registration column map; edit if the form question is renamed'],
    ['col_advisor_name', 'Advisor Name', ''],
    ['col_advisor_email', 'Advisor Email', ''],
    ['col_advisor_phone', 'Advisor Phone', ''],
    ['col_delegate_name', 'Delegate Name', ''],
    ['col_workshop', 'Workshop', ''],
    ['col_waiver_timestamp', 'Timestamp', 'Waiver column map'],
    ['col_waiver_name', 'Participant Name', 'The matcher reads only this column for names'],
    ['col_waiver_dob', 'Date of Birth', ''],
    ['col_waiver_signer', 'Signer Name', ''],
  ];

  function ss() { return SpreadsheetApp.getActive(); }

  /** Create any missing master tables and the Config tab, with headers. Never overwrites data. */
  function ensureSheets() {
    Object.keys(Schema.TABLES).forEach(function (k) {
      var t = Schema.TABLES[k];
      var sh = ss().getSheetByName(t.sheet) || ss().insertSheet(t.sheet);
      if (sh.getLastRow() === 0) {
        sh.getRange(1, 1, 1, t.headers.length).setValues([t.headers]).setFontWeight('bold');
        sh.setFrozenRows(1);
      }
    });
    var cfg = ss().getSheetByName(CONFIG_SHEET) || ss().insertSheet(CONFIG_SHEET);
    if (cfg.getLastRow() === 0) {
      cfg.getRange(1, 1, CONFIG_DEFAULTS.length, 3).setValues(CONFIG_DEFAULTS);
      cfg.getRange(1, 1, 1, 3).setFontWeight('bold');
    }
  }

  function config() {
    var sh = ss().getSheetByName(CONFIG_SHEET);
    var out = {};
    if (!sh) return out;
    sh.getDataRange().getValues().slice(1).forEach(function (r) { if (r[0]) out[String(r[0])] = String(r[1]); });
    return out;
  }

  function registrationColumns(cfg) {
    return { school: cfg.col_school, advisor_name: cfg.col_advisor_name, advisor_email: cfg.col_advisor_email,
      advisor_phone: cfg.col_advisor_phone, delegate_name: cfg.col_delegate_name, workshop: cfg.col_workshop };
  }

  function waiverColumns(cfg) {
    return { timestamp: cfg.col_waiver_timestamp, participant_name: cfg.col_waiver_name,
      date_of_birth: cfg.col_waiver_dob, signer: cfg.col_waiver_signer };
  }

  /** Read a tab with a header row into objects keyed by header (raw tabs, any columns). */
  function readRaw(sheetName) {
    var sh = ss().getSheetByName(sheetName);
    if (!sh || sh.getLastRow() < 2) return [];
    var v = sh.getDataRange().getValues();
    var head = v[0].map(String);
    return v.slice(1).map(function (r) {
      var o = {};
      head.forEach(function (h, i) { o[h] = r[i]; });
      return o;
    });
  }

  function load() {
    var state = Schema.emptyState();
    Object.keys(Schema.TABLES).forEach(function (k) {
      var t = Schema.TABLES[k];
      var sh = ss().getSheetByName(t.sheet);
      state[k] = sh && sh.getLastRow() ? Schema.toObjects(sh.getDataRange().getValues(), t.headers) : [];
    });
    var seed = parseInt(config().seed, 10);
    state.seed = isNaN(seed) ? 1 : seed;
    return state;
  }

  /** Write every table back. The change log is append-only: only new rows are added. */
  function save(state, loadedLogCount) {
    Object.keys(Schema.TABLES).forEach(function (k) {
      var t = Schema.TABLES[k];
      var sh = ss().getSheetByName(t.sheet);
      if (k === 'changeLog') {
        var fresh = state.changeLog.slice(loadedLogCount || 0);
        if (fresh.length) {
          var grid = Schema.toValues(fresh, t.headers).slice(1);
          sh.getRange(sh.getLastRow() + 1, 1, grid.length, t.headers.length).setValues(grid);
        }
        return;
      }
      var values = Schema.toValues(state[k], t.headers);
      var lastRow = sh.getLastRow();
      if (lastRow > values.length) sh.getRange(values.length + 1, 1, lastRow - values.length, t.headers.length).clearContent();
      sh.getRange(1, 1, values.length, t.headers.length).setValues(values);
    });
  }

  /** Replace a derived view tab with a grid. */
  function writeView(name, grid) {
    var sh = ss().getSheetByName(name) || ss().insertSheet(name);
    sh.clear();
    if (grid.length && grid[0].length) {
      sh.getRange(1, 1, grid.length, grid[0].length).setValues(grid);
      sh.getRange(1, 1, 1, grid[0].length).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
    return sh;
  }

  return { ensureSheets: ensureSheets, config: config, registrationColumns: registrationColumns,
    waiverColumns: waiverColumns, readRaw: readRaw, load: load, save: save, writeView: writeView };
})();
