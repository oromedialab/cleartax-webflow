/**
 * Knowledge Hub + Events feed: the "Asset", "Case study" and "Webinar" tabs -> JSON.
 * (Webinar is read by scripts/sync-events.mjs.)
 *
 * This file only exposes the raw rows. All mapping (category, country,
 * date, title rules) lives in scripts/sync-knowledge-hub.mjs so it is
 * versioned in the repo and a sheet edit can never break the build.
 *
 * Setup (once):
 *   1. Sheet > Extensions > Apps Script > paste this file (keep any existing
 *      functions that other things depend on; only one doGet can exist).
 *   2. Deploy > Manage deployments > pencil > Version: New version > Deploy.
 *      Web app, Execute as: Me, Who has access: Anyone.
 *   3. .env.local: KNOWLEDGE_HUB_FEED_URL=<the /exec URL>
 */
var TABS = ['Asset', 'Case study', 'Webinar'];

function doGet() {
  var ss = SpreadsheetApp.getActive();
  var out = {};
  TABS.forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) { out[name] = null; return; }
    var v = sheet.getDataRange().getDisplayValues();
    var headers = v[0].map(function (h) { return String(h).trim(); });
    out[name] = v.slice(1).map(function (row) {
      var o = {};
      headers.forEach(function (h, c) { if (h) o[h] = String(row[c]).trim(); });
      return o;
    });
  });
  return ContentService.createTextOutput(JSON.stringify({ tabs: out }))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Editor helper: prints every tab's headers + first row to the log. */
function inspectTabs() {
  SpreadsheetApp.getActive().getSheets().forEach(function (s) {
    var v = s.getDataRange().getDisplayValues();
    Logger.log('TAB: ' + s.getName() + ' (' + v.length + ' rows)');
    Logger.log('  HEADERS: ' + JSON.stringify(v[0]));
    Logger.log('  ROW 2:   ' + JSON.stringify(v[1] || []));
  });
}
