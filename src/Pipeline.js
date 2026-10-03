/** Apps Script only: the idempotent runs behind menu items and triggers. Each takes the script lock. */
var Pipeline = (function () {
  var FINGERPRINT_KEY = 'tables_fingerprint';
  var VIEW_TABS = { summary: 'School Summary', rosters: 'Room Rosters', review: 'Review Queue', unlinked: 'Unlinked Waivers' };

  function withLock(fn) {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try { return fn(); } finally { lock.releaseLock(); }
  }

  function fingerprint() {
    var parts = ['Delegate', 'Advisor', 'Waiver', 'School', 'Room'].map(function (n) {
      var sh = SpreadsheetApp.getActive().getSheetByName(n);
      return sh && sh.getLastRow() ? JSON.stringify(sh.getDataRange().getValues()) : '';
    });
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, parts.join('\u0001'));
    return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
  }

  function remember() {
    PropertiesService.getScriptProperties().setProperty(FINGERPRINT_KEY, fingerprint());
  }

  function refreshViews(state) {
    Store.writeView(VIEW_TABS.summary, Views.schoolSummary(state));
    Store.writeView(VIEW_TABS.rosters, Views.rosters(state));
    Store.writeView(VIEW_TABS.review, Views.reviewQueue(state));
    Store.writeView(VIEW_TABS.unlinked, Views.unlinkedWaivers(state));
  }

  /** Persist state, redraw views and note what we wrote so the safety net ignores our own edits. */
  function commit(state, loadedLogCount) {
    Store.save(state, loadedLogCount);
    refreshViews(state);
    SpreadsheetApp.flush();
    remember();
  }

  /** Import registration rows. Returns the import summary. */
  function importRegistration(createSchools) {
    return withLock(function () {
      Store.ensureSheets();
      var cfg = Store.config();
      var state = Store.load();
      var logCount = state.changeLog.length;
      var rows = Store.readRaw(cfg.registration_sheet);
      var res = Import.registration(state, rows, Store.registrationColumns(cfg), { createSchools: !!createSchools });
      commit(state, logCount);
      return res;
    });
  }

  /** Ingest new waiver responses and run the matcher. Safe to repeat. */
  function matchWaivers() {
    return withLock(function () {
      Store.ensureSheets();
      var cfg = Store.config();
      var state = Store.load();
      var logCount = state.changeLog.length;
      var added = Waivers.ingest(state, Store.readRaw(cfg.waiver_sheet), Store.waiverColumns(cfg));
      var res = Waivers.run(state);
      commit(state, logCount);
      return { added: added, linked: res.linked, review: res.review.length, unlinked: res.unlinked.length };
    });
  }

  /** Place delegates without a room; with rebuild=true also re-balance everyone not locked. */
  function assignRooms(rebuild) {
    return withLock(function () {
      var state = Store.load();
      var logCount = state.changeLog.length;
      var res = Assign.run(state, { seed: state.seed, rebuild: !!rebuild });
      commit(state, logCount);
      return { placed: res.placed, moved: res.moved, unplaced: res.unplaced.length };
    });
  }

  /** Apply a checked review-queue box: link the waiver to the person. */
  function confirmReviewEdits() {
    return withLock(function () {
      var sh = SpreadsheetApp.getActive().getSheetByName(VIEW_TABS.review);
      if (!sh || sh.getLastRow() < 2) return 0;
      var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
      var state = Store.load();
      var logCount = state.changeLog.length;
      var done = 0;
      rows.forEach(function (r) {
        if (r[5] === true) {
          Waivers.confirm(state, r[0], r[3]);
          state.changeLog.push({
            log_id: Ids.next('log', state.changeLog.map(function (l) { return l.log_id; })),
            timestamp: new Date().toISOString(), user: Session.getActiveUser().getEmail(), table: 'Waiver', row: r[0],
            field: 'matched_delegate_id', old_value: '', new_value: r[3],
          });
          done++;
        }
      });
      if (done) { Assign.run(state, { seed: state.seed }); commit(state, logCount); }
      return done;
    });
  }

  /**
   * Safety net (time trigger): if anyone edited the master sheets directly since the last
   * script write, re-run matching and incremental placement to repair rosters.
   */
  function safetyNet() {
    var last = PropertiesService.getScriptProperties().getProperty(FINGERPRINT_KEY);
    if (last === fingerprint()) return 'unchanged';
    withLock(function () {
      var state = Store.load();
      var logCount = state.changeLog.length;
      Waivers.run(state);
      Assign.run(state, { seed: state.seed });
      commit(state, logCount);
    });
    return 'repaired';
  }

  return { importRegistration: importRegistration, matchWaivers: matchWaivers, assignRooms: assignRooms,
    confirmReviewEdits: confirmReviewEdits, safetyNet: safetyNet, withLock: withLock, commit: commit, VIEW_TABS: VIEW_TABS };
})();
