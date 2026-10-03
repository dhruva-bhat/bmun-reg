/** Apps Script entry points: menu, triggers and the web app. */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('BMUN Registration')
    .addItem('Set up sheets', 'menuSetup')
    .addSeparator()
    .addItem('Import registration (first load, creates schools)', 'menuImportFirst')
    .addItem('Import registration (flag unknown schools)', 'menuImport')
    .addItem('Match waivers', 'menuMatchWaivers')
    .addItem('Place unassigned delegates', 'menuAssign')
    .addItem('Rebuild rosters (can move people)', 'menuRebuild')
    .addSeparator()
    .addItem('Install triggers', 'installTriggers')
    .addToUi();
}

function toast_(msg) { SpreadsheetApp.getActive().toast(msg, 'BMUN Registration', 8); }

function menuSetup() { Store.ensureSheets(); toast_('Sheets ready. Fill the Config tab.'); }

function menuImportFirst() {
  var r = Pipeline.importRegistration(true);
  toast_('Added ' + r.schools + ' schools, ' + r.advisors + ' advisors, ' + r.delegates + ' delegates; ' + r.skipped.length + ' rows skipped.');
}

function menuImport() {
  var r = Pipeline.importRegistration(false);
  var msg = 'Added ' + r.advisors + ' advisors, ' + r.delegates + ' delegates.';
  if (r.unmapped.length) msg += ' Unknown schools (add as an alias in the School tab): ' + r.unmapped.join('; ');
  toast_(msg);
}

function menuMatchWaivers() {
  var r = Pipeline.matchWaivers();
  toast_(r.added + ' new waivers: ' + r.linked + ' linked, ' + r.review + ' to review, ' + r.unlinked + ' unlinked.');
}

function menuAssign() {
  var r = Pipeline.assignRooms(false);
  toast_('Placed ' + r.placed + '; ' + r.unplaced + ' could not be placed (rooms full).');
}

function menuRebuild() {
  var ui = SpreadsheetApp.getUi();
  var ok = ui.alert('Rebuild rosters', 'This can move people who are not locked. Only do this before rosters are printed. Continue?', ui.ButtonSet.YES_NO);
  if (ok !== ui.Button.YES) return;
  var r = Pipeline.assignRooms(true);
  toast_('Placed ' + r.placed + ', moved ' + r.moved + '; ' + r.unplaced + ' could not be placed.');
}

/** Installable triggers; idempotent so it can be run again safely. */
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  var sheet = SpreadsheetApp.getActive();
  ScriptApp.newTrigger('onEditInstalled').forSpreadsheet(sheet).onEdit().create();
  ScriptApp.newTrigger('onWaiverFormSubmit').forSpreadsheet(sheet).onFormSubmit().create();
  ScriptApp.newTrigger('safetyNetTick').timeBased().everyMinutes(5).create();
  toast_('Triggers installed.');
}

function onWaiverFormSubmit() { Pipeline.matchWaivers(); }

function safetyNetTick() { Pipeline.safetyNet(); }

/** One-click confirm: ticking a box on the Review Queue tab links the waiver. */
function onEditInstalled(e) {
  if (e && e.range && e.range.getSheet().getName() === Pipeline.VIEW_TABS.review && e.range.getColumn() === 6) {
    Pipeline.confirmReviewEdits();
  }
}
