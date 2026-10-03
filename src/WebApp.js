/** Apps Script web app for the front desk. Every call is limited to signed-in staff accounts. */

function doGet() {
  var user = WebApp_.requireStaff();
  var t = HtmlService.createTemplateFromFile('Desk');
  t.user = user;
  return t.evaluate().setTitle('BMUN Check-in').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

var WebApp_ = (function () {
  function requireStaff() {
    var email = Session.getActiveUser().getEmail().toLowerCase();
    var allowed = (Store.config().staff_emails || '').toLowerCase().split(',')
      .map(function (e) { return e.trim(); }).filter(Boolean);
    if (!email || allowed.indexOf(email) === -1) throw new Error('Not authorized: ' + (email || 'not signed in'));
    return email;
  }
  return { requireStaff: requireStaff };
})();

function api_searchSchools(query) {
  WebApp_.requireStaff();
  return CheckIn.search(Store.load(), query);
}

function api_getSchool(schoolId) {
  WebApp_.requireStaff();
  return CheckIn.schoolView(Store.load(), schoolId);
}

function api_missingCsv(schoolId) {
  WebApp_.requireStaff();
  return CheckIn.missingCsv(Store.load(), schoolId || '');
}

/** One form for every day-of change; returns the refreshed school view. */
function api_recordChange(action, params) {
  var user = WebApp_.requireStaff();
  return Pipeline.withLock(function () {
    var state = Store.load();
    var logCount = state.changeLog.length;
    Changes.apply(state, { user: user, now: new Date().toISOString() }, action, params);
    Pipeline.commit(state, logCount);
    return CheckIn.schoolView(state, params.school_id || delegateSchool_(state, params));
  });
}

function delegateSchool_(state, params) {
  var d = state.delegates.filter(function (x) { return x.delegate_id === params.delegate_id; })[0];
  if (d) return d.school_id;
  var a = state.advisors.filter(function (x) { return x.advisor_id === params.advisor_id; })[0];
  return a ? a.school_id : '';
}

/** Re-balance everything on demand; staff press this before rosters are printed. */
function api_rebuildRosters() {
  WebApp_.requireStaff();
  return Pipeline.assignRooms(true);
}
